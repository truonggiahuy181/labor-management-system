import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndustryService } from '../industry.service.js';

describe('IndustryService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let enterpriseRepository: { exists: ReturnType<typeof vi.fn> };
  let service: IndustryService;

  beforeEach(() => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((value) => value),
      save: vi.fn((value) => value),
      update: vi.fn(),
      exists: vi.fn(),
      softDelete: vi.fn(),
    };
    enterpriseRepository = { exists: vi.fn() };
    service = new IndustryService(
      repository as any,
      enterpriseRepository as any,
    );
  });

  const industry = {
    id: 1,
    industryCode: '6201',
    industryName: 'Lập trình máy vi tính',
    level: 4,
    parentId: 10,
    isActive: true,
  };

  it('returns active industries ordered by level and code', async () => {
    repository.find.mockResolvedValue([industry]);

    await expect(service.getAll()).resolves.toEqual([industry]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { level: 'ASC', industryCode: 'ASC' },
    });
  });

  it('can include inactive industries and filter by level', async () => {
    repository.find.mockResolvedValue([industry]);

    await service.getAll({ includeInactive: true, level: 4 });

    expect(repository.find).toHaveBeenCalledWith({
      where: { level: 4 },
      order: { level: 'ASC', industryCode: 'ASC' },
    });
  });

  it('filters industries by search, hierarchy and status', async () => {
    repository.find.mockResolvedValue([]);

    await service.getAll({
      search: '620',
      level: 4,
      parentId: 10,
      isActive: false,
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: [
        {
          level: 4,
          parentId: 10,
          isActive: false,
          industryCode: expect.objectContaining({
            _type: 'ilike',
            _value: '%620%',
          }),
        },
        {
          level: 4,
          parentId: 10,
          isActive: false,
          industryName: expect.objectContaining({
            _type: 'ilike',
            _value: '%620%',
          }),
        },
      ],
      order: { level: 'ASC', industryCode: 'ASC' },
    });
  });

  it('keeps the level-four catalogue helper for enterprise CRUD', async () => {
    repository.find.mockResolvedValue([
      {
        ...industry,
      },
    ]);

    await expect(service.getAllLevelFour()).resolves.toEqual([industry]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true, level: 4 },
      order: { level: 'ASC', industryCode: 'ASC' },
    });
  });

  it('returns an industry by ID', async () => {
    repository.findOne.mockResolvedValue(industry);

    await expect(service.getById(1)).resolves.toEqual(industry);
  });

  it('returns INDUSTRY_NOT_FOUND for an unknown ID', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getById(999)).rejects.toThrow(NotFoundException);
  });

  it('creates a root industry with a normalized immutable code', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockImplementation(async (value) => ({ id: 2, ...value }));

    await expect(
      service.create({
        industryCode: ' abc_1 ',
        industryName: ' Ngành mẫu ',
        level: 1,
      }),
    ).resolves.toEqual({
      id: 2,
      industryCode: 'ABC_1',
      industryName: 'Ngành mẫu',
      level: 1,
      parentId: null,
      isActive: true,
    });
  });

  it('rejects a duplicate industry code', async () => {
    repository.findOne.mockResolvedValue(industry);

    await expect(
      service.create({
        industryCode: '6201',
        industryName: 'Tên khác',
        level: 1,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a child whose parent is at the wrong level', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...industry, id: 5, level: 1 });

    await expect(
      service.create({
        industryCode: 'CHILD',
        industryName: 'Ngành con',
        level: 3,
        parentId: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates an industry name without revalidating legacy hierarchy', async () => {
    repository.findOne
      .mockResolvedValueOnce({ ...industry, parentId: null })
      .mockResolvedValueOnce({
        ...industry,
        industryName: 'Tên mới',
        parentId: null,
      });

    await expect(
      service.update(1, { industryName: ' Tên mới ' }),
    ).resolves.toMatchObject({ industryName: 'Tên mới' });
    expect(repository.update).toHaveBeenCalledWith(1, {
      industryName: 'Tên mới',
    });
  });

  it('rejects changing the level of an industry with children', async () => {
    repository.findOne.mockResolvedValue({ ...industry, level: 2 });
    repository.exists.mockResolvedValue(true);

    await expect(service.update(1, { level: 3 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('updates industry status', async () => {
    repository.findOne
      .mockResolvedValueOnce(industry)
      .mockResolvedValueOnce({ ...industry, isActive: false });

    await expect(service.updateStatus(1, false)).resolves.toMatchObject({
      isActive: false,
    });
    expect(repository.update).toHaveBeenCalledWith(1, { isActive: false });
  });

  it('rejects deleting an active industry', async () => {
    repository.findOne.mockResolvedValue(industry);

    await expect(service.remove(1)).rejects.toThrow(BadRequestException);
  });

  it('rejects deleting an industry used by an enterprise', async () => {
    repository.findOne.mockResolvedValue({ ...industry, isActive: false });
    enterpriseRepository.exists.mockResolvedValue(true);

    await expect(service.remove(1)).rejects.toThrow(ConflictException);
  });

  it('rejects deleting an industry with children', async () => {
    repository.findOne.mockResolvedValue({ ...industry, isActive: false });
    enterpriseRepository.exists.mockResolvedValue(false);
    repository.exists.mockResolvedValue(true);

    await expect(service.remove(1)).rejects.toThrow(ConflictException);
  });

  it('soft-deletes an inactive, unused leaf industry', async () => {
    repository.findOne.mockResolvedValue({ ...industry, isActive: false });
    enterpriseRepository.exists.mockResolvedValue(false);
    repository.exists.mockResolvedValue(false);

    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(1);
  });

  it('returns an active level-four industry for enterprise validation', async () => {
    repository.findOne.mockResolvedValue(industry);

    await expect(service.getLevelFourByIdOrFail(1)).resolves.toMatchObject({
      id: 1,
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1, isActive: true },
    });
  });

  it('rejects an active industry outside level four', async () => {
    repository.findOne.mockResolvedValue({ id: 2, level: 2 });

    await expect(service.getLevelFourByIdOrFail(2)).rejects.toThrow(
      BadRequestException,
    );
  });
});
