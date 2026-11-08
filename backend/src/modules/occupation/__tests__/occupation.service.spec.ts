import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OccupationService } from '../occupation.service.js';

const makeOccupation = (overrides: Record<string, unknown> = {}) => ({
  id: 1111,
  occupationCode: '1111',
  occupationName: 'Trưởng ban, Phó Trưởng ban',
  level: 4,
  parentId: 111,
  isActive: true,
  createdBy: 1,
  updatedBy: 1,
  createdAt: new Date('2026-11-05T00:00:00.000Z'),
  updatedAt: new Date('2026-11-05T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('OccupationService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let service: OccupationService;
  let victimGroupRepository: { exists: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((value) => value),
      save: vi.fn(async (value) => makeOccupation(value)),
      update: vi.fn(),
      exists: vi.fn().mockResolvedValue(false),
      softDelete: vi.fn(),
    };
    victimGroupRepository = { exists: vi.fn().mockResolvedValue(false) };
    service = new OccupationService(
      repository as any,
      victimGroupRepository as any,
    );
  });

  it('returns active occupations by default in tree-code order', async () => {
    await service.getAll();

    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { occupationCode: 'ASC' },
    });
  });

  it('filters by code, name, hierarchy and status', async () => {
    await service.getAll({
      occupationCode: '111',
      occupationName: 'lãnh đạo',
      level: 4,
      parentId: 111,
      isActive: false,
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        occupationCode: expect.objectContaining({
          _type: 'ilike',
          _value: '%111%',
        }),
        occupationName: expect.objectContaining({
          _type: 'ilike',
          _value: '%lãnh đạo%',
        }),
        level: 4,
        parentId: 111,
        isActive: false,
      },
      order: { occupationCode: 'ASC' },
    });
  });

  it('returns only active level-four occupations as selectable', async () => {
    await service.getSelectable();

    expect(repository.find).toHaveBeenCalledWith({
      where: { level: 4, isActive: true },
      order: { occupationCode: 'ASC' },
    });
  });

  it('creates a normalized level-one record with code zero', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.create(
      { occupationCode: ' 0 ', occupationName: ' Lực lượng   vũ trang ' },
      9,
    );

    expect(repository.create).toHaveBeenCalledWith({
      occupationCode: '0',
      occupationName: 'Lực lượng vũ trang',
      level: 1,
      parentId: null,
      isActive: true,
      createdBy: 9,
      updatedBy: 9,
    });
    expect(result).toMatchObject({ level: 1, parentId: null });
  });

  it('derives level four from the full active parent chain', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeOccupation({
          id: 111,
          occupationCode: '111',
          level: 3,
          parentId: 11,
        }),
      )
      .mockResolvedValueOnce(
        makeOccupation({
          id: 11,
          occupationCode: '11',
          level: 2,
          parentId: 1,
        }),
      )
      .mockResolvedValueOnce(
        makeOccupation({
          id: 1,
          occupationCode: '1',
          level: 1,
          parentId: null,
        }),
      )
      .mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          occupationCode: '1111',
          occupationName: 'Trưởng ban, Phó Trưởng ban',
          parentId: 111,
        },
        9,
      ),
    ).resolves.toMatchObject({ level: 4, parentId: 111 });
  });

  it('rejects a child code that does not extend its parent code', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeOccupation({
          id: 111,
          occupationCode: '111',
          level: 3,
          parentId: 11,
        }),
      )
      .mockResolvedValueOnce(
        makeOccupation({
          id: 11,
          occupationCode: '11',
          level: 2,
          parentId: 1,
        }),
      )
      .mockResolvedValueOnce(
        makeOccupation({
          id: 1,
          occupationCode: '1',
          level: 1,
          parentId: null,
        }),
      );

    await expect(
      service.create({
        occupationCode: '2111',
        occupationName: 'Sai nhánh',
        parentId: 111,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects creating a child below level four', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeOccupation());

    await expect(
      service.create({
        occupationCode: '1111',
        occupationName: 'Cấp năm',
        parentId: 1111,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate code including a soft-deleted code', async () => {
    repository.findOne.mockResolvedValue(
      makeOccupation({ deletedAt: new Date() }),
    );

    await expect(
      service.create({
        occupationCode: '1111',
        occupationName: 'Tên khác',
        parentId: 111,
      }),
    ).rejects.toThrow(ConflictException);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { occupationCode: '1111' },
      withDeleted: true,
    });
  });

  it('rejects a duplicate normalized name under the same parent', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeOccupation({
          id: 111,
          occupationCode: '111',
          level: 3,
          parentId: 11,
        }),
      )
      .mockResolvedValueOnce(
        makeOccupation({
          id: 11,
          occupationCode: '11',
          level: 2,
          parentId: 1,
        }),
      )
      .mockResolvedValueOnce(
        makeOccupation({
          id: 1,
          occupationCode: '1',
          level: 1,
          parentId: null,
        }),
      )
      .mockResolvedValueOnce(makeOccupation());

    await expect(
      service.create({
        occupationCode: '1112',
        occupationName: 'Trưởng ban, Phó Trưởng ban',
        parentId: 111,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates only the normalized name and audit user', async () => {
    const entity = makeOccupation();
    repository.findOne
      .mockResolvedValueOnce(entity)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...entity, occupationName: 'Tên hiệu chỉnh' });

    await expect(
      service.update(1111, { occupationName: ' Tên   hiệu chỉnh ' }, 20),
    ).resolves.toMatchObject({ occupationName: 'Tên hiệu chỉnh' });
    expect(repository.update).toHaveBeenCalledWith(1111, {
      occupationName: 'Tên hiệu chỉnh',
      updatedBy: 20,
    });
  });

  it('rejects updating an occupation used by an accident report', async () => {
    repository.findOne.mockResolvedValue(makeOccupation());
    victimGroupRepository.exists.mockResolvedValue(true);

    await expect(
      service.update(1111, { occupationName: 'Tên hiệu chỉnh' }, 20),
    ).rejects.toThrow(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects deactivating a parent with active children', async () => {
    repository.findOne.mockResolvedValue(
      makeOccupation({ id: 111, level: 3, occupationCode: '111' }),
    );
    repository.exists.mockResolvedValue(true);

    await expect(service.updateStatus(111, false, 20)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects deactivating an occupation used by an accident report', async () => {
    repository.findOne.mockResolvedValue(makeOccupation());
    victimGroupRepository.exists.mockResolvedValue(true);

    await expect(service.updateStatus(1111, false, 20)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects reactivating when an ancestor is inactive', async () => {
    repository.findOne
      .mockResolvedValueOnce(makeOccupation({ isActive: false }))
      .mockResolvedValueOnce(null);

    await expect(service.updateStatus(1111, true, 20)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updates status when hierarchy rules pass', async () => {
    const entity = makeOccupation();
    repository.findOne
      .mockResolvedValueOnce(entity)
      .mockResolvedValueOnce({ ...entity, isActive: false });

    await expect(service.updateStatus(1111, false, 20)).resolves.toMatchObject({
      isActive: false,
    });
    expect(repository.update).toHaveBeenCalledWith(1111, {
      isActive: false,
      updatedBy: 20,
    });
  });

  it('rejects deleting an active occupation', async () => {
    repository.findOne.mockResolvedValue(makeOccupation());

    await expect(service.remove(1111)).rejects.toThrow(BadRequestException);
  });

  it('rejects deleting an occupation with children', async () => {
    repository.findOne.mockResolvedValue(makeOccupation({ isActive: false }));
    repository.exists.mockResolvedValue(true);

    await expect(service.remove(1111)).rejects.toThrow(ConflictException);
  });

  it('soft-deletes an inactive childless occupation', async () => {
    repository.findOne.mockResolvedValue(makeOccupation({ isActive: false }));

    await expect(service.remove(1111)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(1111);
  });

  it('returns not found for an unknown ID', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getById(999)).rejects.toThrow(NotFoundException);
  });
});
