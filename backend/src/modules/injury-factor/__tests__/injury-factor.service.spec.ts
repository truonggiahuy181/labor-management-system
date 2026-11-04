import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InjuryFactorService } from '../injury-factor.service.js';

const makeInjuryFactor = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  factorCode: 'Mã 1',
  factorName: 'Điện',
  isActive: true,
  createdBy: 10,
  updatedBy: 10,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('InjuryFactorService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let service: InjuryFactorService;

  beforeEach(() => {
    repository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((values) => values),
      save: vi.fn(async (entity) => makeInjuryFactor(entity)),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    service = new InjuryFactorService(repository as any);
  });

  it('returns active factors by default', async () => {
    await service.getAll();

    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { factorCode: 'ASC' },
    });
  });

  it('filters by code, name and status', async () => {
    await service.getAll({
      factorCode: 'Mã 1',
      factorName: 'điện',
      isActive: false,
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        factorCode: expect.objectContaining({
          _type: 'ilike',
          _value: '%Mã 1%',
        }),
        factorName: expect.objectContaining({
          _type: 'ilike',
          _value: '%điện%',
        }),
        isActive: false,
      },
      order: { factorCode: 'ASC' },
    });
  });

  it('creates a normalized active factor', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.create(
      { factorCode: ' Mã   1 ', factorName: ' Điện ' },
      10,
    );

    expect(repository.create).toHaveBeenCalledWith({
      factorCode: 'Mã 1',
      factorName: 'Điện',
      isActive: true,
      createdBy: 10,
      updatedBy: 10,
    });
    expect(result.factorName).toBe('Điện');
  });

  it('rejects a duplicate factor code', async () => {
    repository.findOne.mockResolvedValue(makeInjuryFactor());

    await expect(
      service.create({ factorCode: 'Mã 1', factorName: 'Tên khác' }),
    ).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('updates code, name and status', async () => {
    const entity = makeInjuryFactor();
    repository.findOne.mockImplementation(async ({ where }) =>
      typeof where.id === 'number' ? entity : null,
    );
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(entity, values);
    });

    const result = await service.update(
      1,
      { factorCode: 'Mã 01', factorName: 'Dòng điện', isActive: false },
      20,
    );

    expect(repository.update).toHaveBeenCalledWith(1, {
      factorCode: 'Mã 01',
      factorName: 'Dòng điện',
      isActive: false,
      updatedBy: 20,
    });
    expect(result).toMatchObject({
      factorCode: 'Mã 01',
      factorName: 'Dòng điện',
      isActive: false,
    });
  });

  it('updates status independently', async () => {
    const entity = makeInjuryFactor();
    repository.findOne.mockResolvedValue(entity);
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(entity, values);
    });

    await expect(service.updateStatus(1, false, 20)).resolves.toMatchObject({
      isActive: false,
    });
    expect(repository.update).toHaveBeenCalledWith(1, {
      isActive: false,
      updatedBy: 20,
    });
  });

  it('rejects deleting an active factor', async () => {
    repository.findOne.mockResolvedValue(makeInjuryFactor());

    await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes an inactive factor', async () => {
    repository.findOne.mockResolvedValue(makeInjuryFactor({ isActive: false }));

    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(1);
  });

  it('returns not found for a missing factor', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getById(999)).rejects.toThrow(NotFoundException);
  });
});
