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
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { RoleCode } from '../../commons/constants/role-codes.js';
import {
  DOCUMENT_EXTENSIONS,
  FILE_UPLOAD_FOLDERS,
  IMAGE_EXTENSIONS,
  IMAGE_UPLOAD_FOLDERS,
  MAX_DOCUMENT_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE,
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
  private readonly privateBucket: string;
  private readonly publicBucket: string;
  private readonly publicBaseUrl: string;
  private readonly isClientConfigured: boolean;
  private readonly accessUrlExpiresIn: number;

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
    this.privateBucket =
      this.configService.get<string>('R2_PRIVATE_BUCKET')?.trim() || '';
    this.publicBaseUrl = (
      this.configService.get<string>('R2_PUBLIC_BASE_URL')?.trim() || ''
    ).replace(/\/+$/, '');
    this.isClientConfigured = Boolean(
      accountId && accessKeyId && secretAccessKey,
    );
    this.accessUrlExpiresIn = this.readAccessUrlTtl();
  }

  async upload(
    file: MultipartFile | undefined,
    folder: FileUploadFolder,
    ownerId: number,
  ): Promise<UploadedFileResponse> {
    this.validateFolder(folder);
    this.assertStorageConfigured(folder);
    this.validateFile(file, folder);

    const extension = extname(file.originalname).toLowerCase();
    const objectKey = this.buildObjectKey(folder, ownerId, extension);
    const isPublicImage = IMAGE_UPLOAD_FOLDERS.includes(folder);
    const accessUrl = isPublicImage
      ? this.buildPublicUrl(objectKey)
      : await this.signObject(objectKey);
    const bucket = isPublicImage ? this.publicBucket : this.privateBucket;

    let result: PutObjectCommandOutput;
    try {
      result = await this.r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          ContentDisposition: IMAGE_UPLOAD_FOLDERS.includes(folder)
            ? 'inline'
            : `attachment; filename*=UTF-8''${encodeURIComponent(file.originalname)}`,
          Metadata: {
            'original-name': Buffer.from(file.originalname).toString('base64'),
            'uploaded-by': String(ownerId),
          },
        }),
      );
    } catch (error: unknown) {
      this.logStorageError('R2 PutObject thất bại', error);
      throw this.storageUnavailable();
    }

    return {
      objectKey,
      folder,
      originalName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      etag:
        'ETag' in result && typeof result.ETag === 'string'
          ? result.ETag
          : null,
      accessUrl,
      accessUrlExpiresIn: isPublicImage ? null : this.accessUrlExpiresIn,
      uploadedAt: new Date(),
    };
  }

  async getAccessUrl(
    objectKey: string,
    user: AuthenticatedFileUser,
  ): Promise<FileAccessResponse> {
    const { folder, ownerId } = this.getObjectKeyOwnership(objectKey);
    this.assertStorageConfigured(folder);

    if (
      folder === 'documents' &&
      user.roleCode !== RoleCode.ADMIN &&
      user.id !== ownerId
    ) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Bạn không có quyền truy cập tệp này.',
      });
    }

    return {
      objectKey,
      accessUrl: IMAGE_UPLOAD_FOLDERS.includes(folder)
        ? this.buildPublicUrl(objectKey)
        : await this.signObject(objectKey),
      accessUrlExpiresIn: IMAGE_UPLOAD_FOLDERS.includes(folder)
        ? null
        : this.accessUrlExpiresIn,
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
      : DOCUMENT_EXTENSIONS;

    if (!(allowedExtensions as readonly string[]).includes(extension)) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: IMAGE_UPLOAD_FOLDERS.includes(folder)
          ? 'Chỉ chấp nhận ảnh jpg, jpeg, png, gif hoặc webp.'
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

  private async signObject(objectKey: string): Promise<string> {
    try {
      return await getSignedUrl(
        this.r2Client,
        new GetObjectCommand({
          Bucket: this.privateBucket,
          Key: objectKey,
        }),
        { expiresIn: this.accessUrlExpiresIn },
      );
    } catch (error: unknown) {
      this.logStorageError('Không thể ký R2 access URL', error);
      throw this.storageUnavailable();
    }
  }

  private assertStorageConfigured(folder: FileUploadFolder): void {
    const isPublicImage = IMAGE_UPLOAD_FOLDERS.includes(folder);
    const hasFolderConfiguration = isPublicImage
      ? Boolean(this.publicBucket && this.publicBaseUrl)
      : Boolean(this.privateBucket);
    if (!this.isClientConfigured || !hasFolderConfiguration) {
      throw this.storageUnavailable();
    }
  }

  private buildPublicUrl(objectKey: string): string {
    return `${this.publicBaseUrl}/${objectKey}`;
  }

  private readAccessUrlTtl(): number {
    const rawValue = this.configService.get<string>(
      'R2_PRESIGNED_URL_TTL',
      '900',
    );
    const ttl = Number(rawValue);
    return Number.isInteger(ttl) && ttl >= 60 && ttl <= 3600 ? ttl : 900;
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
