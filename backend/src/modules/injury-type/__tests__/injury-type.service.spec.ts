import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InjuryTypeService } from '../injury-type.service.js';

const makeInjuryType = (overrides: Record<string, unknown> = {}) => ({
  id: 110,
  injuryTypeCode: '110',
  injuryTypeName: 'Chấn thương sọ não',
  level: 3,
  parentId: 11,
  isActive: true,
  createdBy: 1,
  updatedBy: 1,
  createdAt: new Date('2026-11-05T00:00:00.000Z'),
  updatedAt: new Date('2026-11-05T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('InjuryTypeService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let service: InjuryTypeService;

  beforeEach(() => {
    repository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((value) => value),
      save: vi.fn(async (value) => makeInjuryType(value)),
      update: vi.fn(),
      exists: vi.fn().mockResolvedValue(false),
      softDelete: vi.fn(),
    };
    service = new InjuryTypeService(repository as any);
  });

  it('returns active records by default in tree-code order', async () => {
    await service.getAll();

    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { injuryTypeCode: 'ASC' },
    });
  });

  it('returns only active level-three records as selectable', async () => {
    await service.getSelectable();

    expect(repository.find).toHaveBeenCalledWith({
      where: { level: 3, isActive: true },
      order: { injuryTypeCode: 'ASC' },
    });
  });

  it('creates a normalized level-one record', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.create(
      { injuryTypeCode: ' 1 ', injuryTypeName: ' Đầu,   mặt, cổ ' },
      9,
    );

    expect(repository.create).toHaveBeenCalledWith({
      injuryTypeCode: '1',
      injuryTypeName: 'Đầu, mặt, cổ',
      level: 1,
      parentId: null,
      isActive: true,
      createdBy: 9,
      updatedBy: 9,
    });
    expect(result).toMatchObject({ level: 1, parentId: null });
  });

  it('derives child level and validates the full active parent chain', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeInjuryType({
          id: 11,
          injuryTypeCode: '11',
          level: 2,
          parentId: 1,
        }),
      )
      .mockResolvedValueOnce(
        makeInjuryType({
          id: 1,
          injuryTypeCode: '1',
          level: 1,
          parentId: null,
        }),
      )
      .mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          injuryTypeCode: '110',
          injuryTypeName: 'Chấn thương sọ não',
          parentId: 11,
        },
        9,
      ),
    ).resolves.toMatchObject({ level: 3, parentId: 11 });
  });

  it('rejects a child code that does not extend its parent code', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeInjuryType({
          id: 11,
          injuryTypeCode: '11',
          level: 2,
          parentId: 1,
        }),
      )
      .mockResolvedValueOnce(
        makeInjuryType({
          id: 1,
          injuryTypeCode: '1',
          level: 1,
          parentId: null,
        }),
      );

    await expect(
      service.create({
        injuryTypeCode: '210',
        injuryTypeName: 'Sai nhánh',
        parentId: 11,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects creating a child below level three', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeInjuryType());

    await expect(
      service.create({
        injuryTypeCode: '110',
        injuryTypeName: 'Cấp bốn',
        parentId: 110,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate code including a soft-deleted code', async () => {
    repository.findOne.mockResolvedValue(
      makeInjuryType({ deletedAt: new Date() }),
    );

    await expect(
      service.create({
        injuryTypeCode: '110',
        injuryTypeName: 'Tên khác',
        parentId: 11,
      }),
    ).rejects.toThrow(ConflictException);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { injuryTypeCode: '110' },
      withDeleted: true,
    });
  });

  it('rejects a duplicate normalized name under the same parent', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeInjuryType({
          id: 11,
          injuryTypeCode: '11',
          level: 2,
          parentId: 1,
        }),
      )
      .mockResolvedValueOnce(
        makeInjuryType({
          id: 1,
          injuryTypeCode: '1',
          level: 1,
          parentId: null,
        }),
      )
      .mockResolvedValueOnce(makeInjuryType());

    await expect(
      service.create({
        injuryTypeCode: '111',
        injuryTypeName: 'Chấn thương sọ não',
        parentId: 11,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates only the normalized name and audit user', async () => {
    const entity = makeInjuryType();
    repository.findOne
      .mockResolvedValueOnce(entity)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...entity, injuryTypeName: 'Tên hiệu chỉnh' });

    await expect(
      service.update(110, { injuryTypeName: ' Tên   hiệu chỉnh ' }, 20),
    ).resolves.toMatchObject({ injuryTypeName: 'Tên hiệu chỉnh' });
    expect(repository.update).toHaveBeenCalledWith(110, {
      injuryTypeName: 'Tên hiệu chỉnh',
      updatedBy: 20,
    });
  });

  it('rejects deactivating a parent with active children', async () => {
    repository.findOne.mockResolvedValue(
      makeInjuryType({ id: 11, level: 2, injuryTypeCode: '11' }),
    );
    repository.exists.mockResolvedValue(true);

    await expect(service.updateStatus(11, false, 20)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects reactivating when an ancestor is inactive', async () => {
    repository.findOne
      .mockResolvedValueOnce(makeInjuryType({ isActive: false }))
      .mockResolvedValueOnce(null);

    await expect(service.updateStatus(110, true, 20)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updates status when hierarchy rules pass', async () => {
    const entity = makeInjuryType();
    repository.findOne
      .mockResolvedValueOnce(entity)
      .mockResolvedValueOnce({ ...entity, isActive: false });

    await expect(service.updateStatus(110, false, 20)).resolves.toMatchObject({
      isActive: false,
    });
    expect(repository.update).toHaveBeenCalledWith(110, {
      isActive: false,
      updatedBy: 20,
    });
  });

  it('rejects deleting an active record', async () => {
    repository.findOne.mockResolvedValue(makeInjuryType());

    await expect(service.remove(110)).rejects.toThrow(BadRequestException);
  });

  it('rejects deleting a record with children', async () => {
    repository.findOne.mockResolvedValue(makeInjuryType({ isActive: false }));
    repository.exists.mockResolvedValue(true);

    await expect(service.remove(110)).rejects.toThrow(ConflictException);
  });

  it('soft-deletes an inactive childless record', async () => {
    repository.findOne.mockResolvedValue(makeInjuryType({ isActive: false }));

    await expect(service.remove(110)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(110);
  });

  it('returns not found for an unknown ID', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getById(999)).rejects.toThrow(NotFoundException);
  });
});
