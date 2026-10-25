import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessTypeService } from '../business-type.service.js';

describe('BusinessTypeService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let service: BusinessTypeService;

  beforeEach(() => {
    repository = { find: vi.fn(), findOne: vi.fn() };
    service = new BusinessTypeService(repository as any);
  });

  it('returns active business types ordered by name', async () => {
    repository.find.mockResolvedValue([
      {
        id: 1,
        typeCode: 'TNHH1',
        typeName: 'Công ty TNHH',
        isActive: true,
      },
    ]);

    await expect(service.getAllActive()).resolves.toEqual([
      { id: 1, typeCode: 'TNHH1', typeName: 'Công ty TNHH' },
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { typeName: 'ASC' },
    });
  });

  it('returns an active business type', async () => {
    repository.findOne.mockResolvedValue({ id: 1, isActive: true });

    await expect(service.getActiveByIdOrFail(1)).resolves.toMatchObject({
      id: 1,
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1, isActive: true },
    });
  });

  it('rejects a missing or inactive business type', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getActiveByIdOrFail(99)).rejects.toThrow(
      BadRequestException,
    );
  });
});
