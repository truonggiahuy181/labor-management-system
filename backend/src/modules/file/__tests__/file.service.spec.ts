import {
  BadRequestException,
  ForbiddenException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleCode } from '../../../commons/constants/role-codes.js';
import { MAX_IMAGE_FILE_SIZE } from '../file.constants.js';
import { FileService } from '../file.service.js';
import type { MultipartFile } from '../file.types.js';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe('FileService', () => {
  let send: ReturnType<typeof vi.fn>;
  let service: FileService;

  beforeEach(() => {
    send = vi.fn().mockResolvedValue({ ETag: '"etag-value"' });
    vi.mocked(getSignedUrl).mockReset();
    vi.mocked(getSignedUrl).mockResolvedValue(
      'https://account.r2.cloudflarestorage.com/signed',
    );
    service = createService(send);
  });

  it('upload ảnh lên public bucket và trả URL cố định', async () => {
    const file = createPngFile();

    const result = await service.upload(file, 'avatars', 12);

    expect(result.objectKey).toMatch(
      /^avatars\/12\/\d{4}\/(0[1-9]|1[0-2])\/[0-9a-f-]{36}\.png$/,
    );
    expect(result.originalName).toBe('avatar.png');
    expect(result.accessUrl).toBe(
      `https://images.example.com/${result.objectKey}`,
    );
    expect(result.accessUrlExpiresIn).toBeNull();
    expect(result.etag).toBe('"etag-value"');

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'labor-public-images',
      Key: result.objectKey,
      Body: file.buffer,
      ContentType: 'image/png',
      ContentLength: file.size,
      ContentDisposition: 'inline',
      Metadata: {
        'original-name': 'YXZhdGFyLnBuZw==',
        'uploaded-by': '12',
      },
    });
  });

  it('upload tài liệu PDF vào documents', async () => {
    const buffer = Buffer.from('%PDF-1.7 test');
    const file: MultipartFile = {
      originalname: 'hop-dong.pdf',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
    };

    const result = await service.upload(file, 'documents', 8);

    expect(result.objectKey).toMatch(/^documents\/8\/.+\.pdf$/);
    expect(send.mock.calls[0][0].input.Bucket).toBe('labor-private-files');
    expect(result.accessUrlExpiresIn).toBe(900);
    expect(send.mock.calls[0][0].input.ContentDisposition).toBe(
      "attachment; filename*=UTF-8''hop-dong.pdf",
    );
    expect(send).toHaveBeenCalledOnce();
  });

  it('từ chối ảnh giả mạo bằng phần mở rộng', async () => {
    const file = createPngFile();
    file.buffer = Buffer.from('<script>alert(1)</script>');
    file.size = file.buffer.length;

    await expect(service.upload(file, 'avatars', 12)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('từ chối tên tệp chứa đường dẫn', async () => {
    const file = createPngFile();
    file.originalname = '../avatar.png';

    await expect(service.upload(file, 'avatars', 12)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('từ chối tài liệu được upload vào thư mục ảnh', async () => {
    const buffer = Buffer.from('%PDF-1.7 test');
    const file: MultipartFile = {
      originalname: 'hop-dong.pdf',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
    };

    await expect(service.upload(file, 'logos', 12)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('từ chối ảnh vượt quá 5 MB', async () => {
    const file = createPngFile();
    file.size = MAX_IMAGE_FILE_SIZE + 1;

    await expect(service.upload(file, 'avatars', 12)).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
  });

  it('cho phép chủ sở hữu tạo lại access URL', async () => {
    const objectKey =
      'documents/12/2026/10/550e8400-e29b-41d4-a716-446655440000.pdf';

    const result = await service.getAccessUrl(objectKey, {
      id: 12,
      roleCode: RoleCode.ENTERPRISE_USER,
    });

    expect(result.objectKey).toBe(objectKey);
    expect(result.accessUrlExpiresIn).toBe(900);
    expect(getSignedUrl).toHaveBeenCalledOnce();
  });

  it('cho phép ADMIN truy cập file của người dùng khác', async () => {
    const objectKey =
      'documents/12/2026/10/550e8400-e29b-41d4-a716-446655440000.pdf';

    await expect(
      service.getAccessUrl(objectKey, {
        id: 1,
        roleCode: RoleCode.ADMIN,
      }),
    ).resolves.toMatchObject({ objectKey });
  });

  it('cho phép người dùng đã đăng nhập xem avatar của người khác', async () => {
    const objectKey =
      'avatars/12/2026/10/550e8400-e29b-41d4-a716-446655440000.png';

    await expect(
      service.getAccessUrl(objectKey, {
        id: 13,
        roleCode: RoleCode.ENTERPRISE_USER,
      }),
    ).resolves.toMatchObject({
      objectKey,
      accessUrl: `https://images.example.com/${objectKey}`,
      accessUrlExpiresIn: null,
    });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('chặn người dùng truy cập file không thuộc sở hữu', async () => {
    const objectKey =
      'documents/12/2026/10/550e8400-e29b-41d4-a716-446655440000.pdf';

    await expect(
      service.getAccessUrl(objectKey, {
        id: 13,
        roleCode: RoleCode.ENTERPRISE_USER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('trả 503 khi R2 upload lỗi', async () => {
    send.mockRejectedValueOnce(new Error('R2 unavailable'));

    await expect(
      service.upload(createPngFile(), 'avatars', 12),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('trả 503 khi bucket chưa được cấu hình', async () => {
    service = createService(send, { R2_BUCKET: '' });

    await expect(
      service.upload(createPngFile(), 'avatars', 12),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });
});

function createService(
  send: ReturnType<typeof vi.fn>,
  overrides: Record<string, string> = {},
): FileService {
  const values: Record<string, string> = {
    R2_ACCOUNT_ID: 'cloudflare-account-id',
    R2_BUCKET: 'labor-public-images',
    R2_PRIVATE_BUCKET: 'labor-private-files',
    R2_PUBLIC_BASE_URL: 'https://images.example.com',
    R2_ACCESS_KEY_ID: 'r2-access-key',
    R2_SECRET_ACCESS_KEY: 'r2-secret-key',
    R2_PRESIGNED_URL_TTL: '900',
    ...overrides,
  };
  const configService = {
    get: vi.fn((key: string, defaultValue?: string) =>
      key in values ? values[key] : defaultValue,
    ),
  } as unknown as ConfigService;

  return new FileService({ send } as unknown as S3Client, configService);
}

function createPngFile(): MultipartFile {
  return {
    originalname: 'avatar.png',
    mimetype: 'image/png',
    size: PNG_SIGNATURE.length,
    buffer: Buffer.from(PNG_SIGNATURE),
  };
}
