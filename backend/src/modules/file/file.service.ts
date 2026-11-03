import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import {
  DOCUMENT_EXTENSIONS,
  FILE_UPLOAD_FOLDERS,
  IMAGE_EXTENSIONS,
  IMAGE_UPLOAD_FOLDERS,
  MAX_DOCUMENT_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE,
  PUBLIC_UPLOAD_FOLDERS,
  STORAGE_OBJECT_KEY_PATTERN,
} from './file.constants.js';
import type { FileUploadFolder } from './file.constants.js';
import { R2_CLIENT } from './r2-client.provider.js';
import type {
  AuthenticatedFileUser,
  FileAccessResponse,
  MultipartFile,
  UploadedFileResponse,
} from './file.types.js';

const CONTENT_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly publicBucket: string;
  private readonly publicBaseUrl: string;
  private readonly isClientConfigured: boolean;
  private readonly uploadedMetadata = new Map<
    string,
    {
      objectKey: string;
      originalName: string;
      contentType: string;
      size: number;
    }
  >();

  constructor(
    @Inject(R2_CLIENT) private readonly r2Client: S3Client,
    private readonly configService: ConfigService,
  ) {
    const accountId =
      this.configService.get<string>('R2_ACCOUNT_ID')?.trim() || '';
    const accessKeyId =
      this.configService.get<string>('R2_ACCESS_KEY_ID')?.trim() || '';
    const secretAccessKey =
      this.configService.get<string>('R2_SECRET_ACCESS_KEY')?.trim() || '';
    this.publicBucket =
      this.configService.get<string>('R2_BUCKET')?.trim() || '';
    this.publicBaseUrl = (
      this.configService.get<string>('R2_PUBLIC_BASE_URL')?.trim() || ''
    ).replace(/\/+$/, '');
    this.isClientConfigured = Boolean(
      accountId && accessKeyId && secretAccessKey,
    );
  }

  async upload(
    file: MultipartFile | undefined,
    folder: FileUploadFolder,
    ownerId: number,
  ): Promise<UploadedFileResponse> {
    this.validateFolder(folder);
    this.assertStorageConfigured(folder);
    const normalizedFile = this.normalizeFileName(file);
    this.validateFile(normalizedFile, folder);

    const extension = extname(normalizedFile.originalname).toLowerCase();
    const objectKey = this.buildObjectKey(folder, ownerId, extension);
    const accessUrl = this.buildPublicUrl(objectKey);
    const bucket = this.publicBucket;

    let result: PutObjectCommandOutput;
    try {
      result = await this.r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: normalizedFile.buffer,
          ContentType: normalizedFile.mimetype,
          ContentLength: normalizedFile.size,
          ContentDisposition: 'inline',
          Metadata: {
            'original-name': Buffer.from(normalizedFile.originalname).toString(
              'base64',
            ),
            'uploaded-by': String(ownerId),
          },
        }),
      );
    } catch (error: unknown) {
      this.logStorageError('R2 PutObject thất bại', error);
      throw this.storageUnavailable();
    }

    if (this.uploadedMetadata.size >= 1000) {
      const oldestKey = this.uploadedMetadata.keys().next().value;
      if (oldestKey) this.uploadedMetadata.delete(oldestKey);
    }
    this.uploadedMetadata.set(objectKey, {
      objectKey,
      originalName: normalizedFile.originalname,
      contentType: normalizedFile.mimetype,
      size: normalizedFile.size,
    });

    return {
      objectKey,
      folder,
      originalName: normalizedFile.originalname,
      contentType: normalizedFile.mimetype,
      size: normalizedFile.size,
      etag:
        'ETag' in result && typeof result.ETag === 'string'
          ? result.ETag
          : null,
      accessUrl,
      accessUrlExpiresIn: null,
      uploadedAt: new Date(),
    };
  }

  async getAccessUrl(
    objectKey: string,
    _user: AuthenticatedFileUser,
  ): Promise<FileAccessResponse> {
    const { folder } = this.getObjectKeyOwnership(objectKey);
    this.assertStorageConfigured(folder);

    return {
      objectKey,
      accessUrl: this.buildPublicUrl(objectKey),
      accessUrlExpiresIn: null,
    };
  }

  async getPublicDocumentAccessUrl(
    objectKey: string,
  ): Promise<FileAccessResponse> {
    const { folder, ownerId } = this.getObjectKeyOwnership(objectKey);
    this.assertStorageConfigured(folder);

    if (
      (folder !== 'enterprise-files' && folder !== 'documents') ||
      ownerId !== 0
    ) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Bạn không có quyền truy cập tệp này.',
      });
    }

    return {
      objectKey,
      accessUrl: this.buildPublicUrl(objectKey),
      accessUrlExpiresIn: null,
    };
  }

  assertOwnedAvatarObjectKey(objectKey: string, ownerId: number): void {
    const ownership = this.getObjectKeyOwnership(objectKey);
    if (ownership.folder !== 'avatars' || ownership.ownerId !== ownerId) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'Avatar không hợp lệ hoặc không thuộc tài khoản hiện tại.',
      });
    }
  }

  async getAvatarAccessUrl(objectKey: string): Promise<string> {
    const ownership = this.getObjectKeyOwnership(objectKey);
    if (ownership.folder !== 'avatars') {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'objectKey không phải là ảnh đại diện.',
      });
    }
    this.assertStorageConfigured(ownership.folder);
    return this.buildPublicUrl(objectKey);
  }

  getEnterpriseFileAccessUrl(objectKey: string): string {
    const ownership = this.getObjectKeyOwnership(objectKey);
    if (
      ownership.folder !== 'enterprise-files' &&
      !(ownership.folder === 'documents' && ownership.ownerId === 0)
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'objectKey không phải là tệp của doanh nghiệp.',
      });
    }
    this.assertStorageConfigured(ownership.folder);
    return this.buildPublicUrl(objectKey);
  }

  resolveEnterpriseStoredFile(objectKey: string): {
    objectKey: string;
    originalName: string;
    contentType: string;
    size: number;
  } {
    const ownership = this.getObjectKeyOwnership(objectKey);
    if (
      ownership.folder !== 'enterprise-files' &&
      !(ownership.folder === 'documents' && ownership.ownerId === 0)
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'objectKey không phải là tệp của doanh nghiệp.',
      });
    }
    const cached = this.uploadedMetadata.get(objectKey);
    if (cached) {
      return { ...cached };
    }
    const extension = extname(objectKey).toLowerCase();
    const contentType =
      CONTENT_TYPES_BY_EXTENSION[extension]?.[0] ?? 'application/octet-stream';
    return {
      objectKey,
      originalName: objectKey.split('/').pop() ?? objectKey,
      contentType,
      size: 0,
    };
  }

  async deleteEnterpriseFile(objectKey: string): Promise<void> {
    const ownership = this.getObjectKeyOwnership(objectKey);
    if (
      ownership.folder !== 'enterprise-files' &&
      !(ownership.folder === 'documents' && ownership.ownerId === 0)
    ) {
      return;
    }

    try {
      await this.r2Client.send(
        new DeleteObjectCommand({
          Bucket: this.publicBucket,
          Key: objectKey,
        }),
      );
      this.uploadedMetadata.delete(objectKey);
    } catch (error: unknown) {
      this.logStorageError('Không thể dọn tệp doanh nghiệp cũ trên R2', error);
    }
  }

  normalizeOriginalFileName(originalName: string): string {
    if (
      [...originalName].some((character) => character.charCodeAt(0) > 255)
    ) {
      return originalName;
    }

    const decodedName = Buffer.from(originalName, 'latin1').toString('utf8');
    return decodedName.includes('\uFFFD') ? originalName : decodedName;
  }

  private validateFolder(folder: string): asserts folder is FileUploadFolder {
    if (!(FILE_UPLOAD_FOLDERS as readonly string[]).includes(folder)) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_UPLOAD_FOLDER,
        message: 'Thư mục tải lên không hợp lệ.',
      });
    }
  }

  private validateFile(
    file: MultipartFile | undefined,
    folder: FileUploadFolder,
  ): asserts file is MultipartFile {
    if (!file) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'Vui lòng chọn tệp cần tải lên.',
      });
    }

    const maxSize = IMAGE_UPLOAD_FOLDERS.includes(folder)
      ? MAX_IMAGE_FILE_SIZE
      : MAX_DOCUMENT_FILE_SIZE;
    if (file.size > maxSize) {
      throw new PayloadTooLargeException({
        code: ErrorCode.FILE_TOO_LARGE,
        message: `Kích thước tệp không được vượt quá ${maxSize / 1024 / 1024} MB.`,
      });
    }

    if (
      file.size !== file.buffer.length ||
      !file.originalname.trim() ||
      file.originalname.length > 255 ||
      this.hasUnsafeFileNameCharacter(file.originalname)
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'Tên hoặc kích thước tệp không hợp lệ.',
      });
    }

    const extension = extname(file.originalname).toLowerCase();
    const allowedExtensions = IMAGE_UPLOAD_FOLDERS.includes(folder)
      ? IMAGE_EXTENSIONS
      : folder === 'enterprise-files'
        ? [...IMAGE_EXTENSIONS, ...DOCUMENT_EXTENSIONS]
        : DOCUMENT_EXTENSIONS;

    if (!(allowedExtensions as readonly string[]).includes(extension)) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: IMAGE_UPLOAD_FOLDERS.includes(folder)
          ? 'Chỉ chấp nhận ảnh jpg, jpeg, png, gif hoặc webp.'
          : folder === 'enterprise-files'
            ? 'Chỉ chấp nhận ảnh, PDF, Word hoặc Excel.'
            : 'Chỉ chấp nhận tài liệu pdf, doc, docx, xls hoặc xlsx.',
      });
    }

    if (
      !CONTENT_TYPES_BY_EXTENSION[extension]?.includes(file.mimetype) ||
      !this.hasValidFileSignature(extension, file.buffer)
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'Nội dung tệp không khớp với định dạng khai báo.',
      });
    }
  }

  private normalizeFileName(
    file: MultipartFile | undefined,
  ): MultipartFile | undefined {
    if (!file) return undefined;

    // Multer/Busboy có thể đọc filename UTF-8 như Latin-1, ví dụ
    // "Giấy phép.pdf" thành "Giáº¥y phÃ©p.pdf".
    return {
      ...file,
      originalname: this.normalizeOriginalFileName(file.originalname),
    };
  }

  private hasValidFileSignature(extension: string, buffer: Buffer): boolean {
    if (extension === '.jpg' || extension === '.jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }
    if (extension === '.png') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (extension === '.gif') {
      return ['GIF87a', 'GIF89a'].includes(
        buffer.subarray(0, 6).toString('ascii'),
      );
    }
    if (extension === '.webp') {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    if (extension === '.pdf') {
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    if (extension === '.doc' || extension === '.xls') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    }
    return (
      (extension === '.docx' || extension === '.xlsx') &&
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(buffer[2]) &&
      [0x04, 0x06, 0x08].includes(buffer[3])
    );
  }

  private hasUnsafeFileNameCharacter(fileName: string): boolean {
    return [...fileName].some((character) => {
      const characterCode = character.charCodeAt(0);
      return character === '/' || character === '\\' || characterCode < 32;
    });
  }

  private buildObjectKey(
    folder: FileUploadFolder,
    ownerId: number,
    extension: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${folder}/${ownerId}/${year}/${month}/${randomUUID()}${extension}`;
  }

  private getObjectKeyOwnership(objectKey: string): {
    folder: FileUploadFolder;
    ownerId: number;
  } {
    const match = STORAGE_OBJECT_KEY_PATTERN.exec(objectKey);
    if (!match) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'objectKey không hợp lệ.',
      });
    }
    return {
      folder: match[1] as FileUploadFolder,
      ownerId: Number(match[2]),
    };
  }

  private assertStorageConfigured(folder: FileUploadFolder): void {
    if (
      !PUBLIC_UPLOAD_FOLDERS.includes(folder) ||
      !this.isClientConfigured ||
      !this.publicBucket ||
      !this.publicBaseUrl
    ) {
      throw this.storageUnavailable();
    }
  }

  private buildPublicUrl(objectKey: string): string {
    return `${this.publicBaseUrl}/${objectKey}`;
  }

  private storageUnavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      code: ErrorCode.FILE_STORAGE_UNAVAILABLE,
      message: 'Dịch vụ lưu trữ tệp tạm thời không khả dụng.',
    });
  }

  private logStorageError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
