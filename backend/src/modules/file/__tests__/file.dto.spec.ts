import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { FileAccessQueryDto } from '../dto/file-access-query.dto.js';
import { UploadFileDto } from '../dto/upload-file.dto.js';

describe('File DTO', () => {
  it.each(['avatars', 'logos', 'documents'] as const)(
    'chấp nhận thư mục %s',
    async (folder) => {
      const dto = plainToInstance(UploadFileDto, { folder });
      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('từ chối thư mục không hỗ trợ', async () => {
    const dto = plainToInstance(UploadFileDto, { folder: 'executables' });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('chấp nhận object key hợp lệ', async () => {
    const dto = plainToInstance(FileAccessQueryDto, {
      objectKey:
        'documents/12/2026/10/550e8400-e29b-41d4-a716-446655440000.pdf',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('từ chối object key không do hệ thống tạo', async () => {
    const dto = plainToInstance(FileAccessQueryDto, {
      objectKey: '../private/secret.pdf',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
