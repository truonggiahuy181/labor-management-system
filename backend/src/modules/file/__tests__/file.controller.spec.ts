import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleCode } from '../../../commons/constants/role-codes.js';
import type { FileAccessQueryDto } from '../dto/file-access-query.dto.js';
import type { UploadFileDto } from '../dto/upload-file.dto.js';
import { FileController } from '../file.controller.js';
import type { FileService } from '../file.service.js';
import type { AuthenticatedFileUser, MultipartFile } from '../file.types.js';

describe('FileController', () => {
  let controller: FileController;
  let fileService: Partial<FileService>;
  const user: AuthenticatedFileUser = {
    id: 12,
    roleCode: RoleCode.ENTERPRISE_USER,
  };

  beforeEach(() => {
    fileService = {
      upload: vi.fn(),
      getAccessUrl: vi.fn(),
    };
    controller = new FileController(fileService as FileService);
  });

  it('chuyển file, folder và user id đến service', async () => {
    const file: MultipartFile = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.alloc(8),
    };
    const dto: UploadFileDto = { folder: 'avatars' };
    const response = {
      objectKey: 'avatars/12/2026/10/550e8400-e29b-41d4-a716-446655440000.png',
      folder: 'avatars' as const,
      originalName: 'avatar.png',
      contentType: 'image/png',
      size: 8,
      etag: 'etag',
      accessUrl: 'https://signed.example.com',
      accessUrlExpiresIn: 900,
      uploadedAt: new Date('2026-10-28T08:00:00.000Z'),
    };
    vi.mocked(fileService.upload!).mockResolvedValue(response);

    const result = await controller.upload(file, dto, user);

    expect(fileService.upload).toHaveBeenCalledWith(file, 'avatars', 12);
    expect(result).toBe(response);
  });

  it('chuyển yêu cầu cấp access URL đến service', async () => {
    const query: FileAccessQueryDto = {
      objectKey:
        'documents/12/2026/10/550e8400-e29b-41d4-a716-446655440000.pdf',
    };
    const response = {
      objectKey: query.objectKey,
      accessUrl: 'https://signed.example.com',
      accessUrlExpiresIn: 900,
    };
    vi.mocked(fileService.getAccessUrl!).mockResolvedValue(response);

    const result = await controller.getAccessUrl(query, user);

    expect(fileService.getAccessUrl).toHaveBeenCalledWith(
      query.objectKey,
      user,
    );
    expect(result).toBe(response);
  });
});
