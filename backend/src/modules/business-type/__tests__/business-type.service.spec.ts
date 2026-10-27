import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessTypeService } from '../business-type.service.js';

describe('BusinessTypeService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let enterpriseRepository: { exists: ReturnType<typeof vi.fn> };
  let service: BusinessTypeService;

  beforeEach(() => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((values) => values),
      save: vi.fn(async (entity) => ({ id: 2, ...entity })),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    enterpriseRepository = { exists: vi.fn() };
    service = new BusinessTypeService(
      repository as any,
      enterpriseRepository as any,
    );
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
      {
        id: 1,
        typeCode: 'TNHH1',
        typeName: 'Công ty TNHH',
        isActive: true,
      },
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

  it('can include inactive business types for management', async () => {
    repository.find.mockResolvedValue([
      {
        id: 2,
        typeCode: 'DNTN',
        typeName: 'Doanh nghiệp tư nhân',
        isActive: false,
      },
    ]);

    await expect(
      service.getAll({ includeInactive: true }),
    ).resolves.toHaveLength(1);
    expect(repository.find).toHaveBeenCalledWith({
      where: {},
      order: { typeName: 'ASC' },
    });
  });

  it('filters business types by search and status', async () => {
    repository.find.mockResolvedValue([]);

    await service.getAll({ search: 'tnhh', isActive: false });

    expect(repository.find).toHaveBeenCalledWith({
      where: [
        {
          isActive: false,
          typeCode: expect.objectContaining({
            _type: 'ilike',
            _value: '%tnhh%',
          }),
        },
        {
          isActive: false,
          typeName: expect.objectContaining({
            _type: 'ilike',
            _value: '%tnhh%',
          }),
        },
      ],
      order: { typeName: 'ASC' },
    });
  });

  it('creates an active business type with a normalized code', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ typeCode: ' dntn ', typeName: 'Doanh nghiệp tư nhân' }),
    ).resolves.toMatchObject({
      id: 2,
      typeCode: 'DNTN',
      typeName: 'Doanh nghiệp tư nhân',
      isActive: true,
    });
  });

  it('rejects a duplicate business type code', async () => {
    repository.findOne.mockResolvedValue({ id: 1 });

    await expect(
      service.create({ typeCode: 'TNHH1', typeName: 'Tên bị trùng mã' }),
    ).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('updates only the business type name', async () => {
    const businessType = {
      id: 1,
      typeCode: 'TNHH1',
      typeName: 'Tên cũ',
      isActive: true,
    };
    repository.findOne.mockImplementation(async () => businessType);
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(businessType, values);
    });

    const result = await service.update(1, { typeName: 'Tên mới' });

    expect(repository.update).toHaveBeenCalledWith(1, {
      typeName: 'Tên mới',
    });
    expect(result.typeName).toBe('Tên mới');
    expect(result.typeCode).toBe('TNHH1');
  });

  it('deactivates a business type without deleting it', async () => {
    const businessType = {
      id: 1,
      typeCode: 'TNHH1',
      typeName: 'Công ty TNHH',
      isActive: true,
    };
    repository.findOne.mockImplementation(async () => businessType);
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(businessType, values);
    });

    const result = await service.updateStatus(1, false);

    expect(repository.update).toHaveBeenCalledWith(1, { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('rejects deleting an active business type', async () => {
    repository.findOne.mockResolvedValue({ id: 1, isActive: true });

    await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('rejects deleting a business type used by an enterprise', async () => {
    repository.findOne.mockResolvedValue({ id: 1, isActive: false });
    enterpriseRepository.exists.mockResolvedValue(true);

    await expect(service.remove(1)).rejects.toThrow(ConflictException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes an inactive, unused business type', async () => {
    repository.findOne.mockResolvedValue({ id: 1, isActive: false });
    enterpriseRepository.exists.mockResolvedValue(false);

    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(1);
  });
});
