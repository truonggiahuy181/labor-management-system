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
    industryCode: 'J6201',
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
        industryCode: 'J',
        industryName: 'Tên khác',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('derives a child level from its active parent chain', async () => {
    repository.findOne
      .mockResolvedValueOnce({
        ...industry,
        id: 5,
        industryCode: 'J620',
        level: 3,
        parentId: 4,
      })
      .mockResolvedValueOnce({
        ...industry,
        id: 4,
        industryCode: 'J62',
        level: 2,
        parentId: 3,
      })
      .mockResolvedValueOnce({
        ...industry,
        id: 3,
        industryCode: 'J',
        level: 1,
        parentId: null,
      })
      .mockResolvedValueOnce(null);
    repository.save.mockImplementation(async (value) => ({ id: 6, ...value }));

    await expect(
      service.create({
        industryCode: '6201',
        industryName: 'Ngành con',
        parentId: 5,
      }),
    ).resolves.toMatchObject({
      id: 6,
      industryCode: 'J6201',
      level: 4,
      parentId: 5,
    });
  });

  it('rejects creating a child below level four', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...industry, id: 5, level: 4 });

    await expect(
      service.create({
        industryCode: 'CHILD',
        industryName: 'Ngành con',
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

  it('rejects changing the parent of an industry with children', async () => {
    repository.findOne
      .mockResolvedValueOnce({ ...industry, level: 2, parentId: 10 })
      .mockResolvedValueOnce({
        ...industry,
        id: 20,
        industryCode: 'J',
        level: 1,
        parentId: null,
      });
    repository.exists.mockResolvedValue(true);
    enterpriseRepository.exists.mockResolvedValue(false);

    await expect(service.update(1, { parentId: 20 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects changing the parent of an industry used by an enterprise', async () => {
    repository.findOne
      .mockResolvedValueOnce(industry)
      .mockResolvedValueOnce({
        ...industry,
        id: 20,
        industryCode: 'J620',
        level: 3,
        parentId: 30,
      })
      .mockResolvedValueOnce({
        ...industry,
        id: 30,
        industryCode: 'J62',
        level: 2,
        parentId: 40,
      })
      .mockResolvedValueOnce({
        ...industry,
        id: 40,
        industryCode: 'J',
        level: 1,
        parentId: null,
      });
    repository.exists.mockResolvedValue(false);
    enterpriseRepository.exists.mockResolvedValue(true);

    await expect(service.update(1, { parentId: 20 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects choosing itself as parent', async () => {
    repository.findOne.mockResolvedValueOnce(industry);

    await expect(service.update(1, { parentId: 1 })).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('reparents an unused leaf and derives its level', async () => {
    repository.findOne
      .mockResolvedValueOnce(industry)
      .mockResolvedValueOnce({
        ...industry,
        id: 20,
        industryCode: 'J62',
        level: 2,
        parentId: 30,
      })
      .mockResolvedValueOnce({
        ...industry,
        id: 30,
        industryCode: 'J',
        level: 1,
        parentId: null,
      })
      .mockResolvedValueOnce({
        ...industry,
        level: 3,
        parentId: 20,
      });
    repository.exists.mockResolvedValue(false);
    enterpriseRepository.exists.mockResolvedValue(false);

    await expect(service.update(1, { parentId: 20 })).resolves.toMatchObject({
      level: 3,
      parentId: 20,
    });
    expect(repository.update).toHaveBeenCalledWith(1, {
      level: 3,
      parentId: 20,
    });
  });

  it('rejects moving an industry to a different level-one prefix', async () => {
    repository.findOne
      .mockResolvedValueOnce(industry)
      .mockResolvedValueOnce({
        ...industry,
        id: 20,
        industryCode: 'G46',
        level: 2,
        parentId: 30,
      })
      .mockResolvedValueOnce({
        ...industry,
        id: 30,
        industryCode: 'G',
        level: 1,
        parentId: null,
      });

    await expect(service.update(1, { parentId: 20 })).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates industry status', async () => {
    repository.findOne
      .mockResolvedValueOnce(industry)
      .mockResolvedValueOnce({ ...industry, isActive: false });
    enterpriseRepository.exists.mockResolvedValue(false);
    repository.exists.mockResolvedValue(false);

    await expect(service.updateStatus(1, false)).resolves.toMatchObject({
      isActive: false,
    });
    expect(enterpriseRepository.exists).toHaveBeenCalledWith({
      where: { industryId: 1 },
    });
    expect(repository.exists).toHaveBeenCalledWith({
      where: { parentId: 1, isActive: true },
    });
    expect(repository.update).toHaveBeenCalledWith(1, { isActive: false });
  });

  it('rejects deactivating an industry used by an enterprise', async () => {
    repository.findOne.mockResolvedValue(industry);
    enterpriseRepository.exists.mockResolvedValue(true);
    repository.exists.mockResolvedValue(false);

    await expect(service.updateStatus(1, false)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects deactivating an industry with active children', async () => {
    repository.findOne.mockResolvedValue({
      ...industry,
      level: 2,
      parentId: null,
    });
    enterpriseRepository.exists.mockResolvedValue(false);
    repository.exists.mockResolvedValue(true);

    await expect(service.updateStatus(1, false)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects reactivating an industry whose parent is inactive', async () => {
    repository.findOne
      .mockResolvedValueOnce({ ...industry, isActive: false })
      .mockResolvedValueOnce(null);

    await expect(service.updateStatus(1, true)).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
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
