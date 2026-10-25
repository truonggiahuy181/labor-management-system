import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { EnterpriseService } from '../enterprise.service.js';
import type { CreateEnterpriseDto } from '../dto/enterprise.dto.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-initial-password'),
}));

const createDto = (): CreateEnterpriseDto => ({
  companyName: 'Công ty TNHH ABC',
  taxCode: '0101234567',
  businessType: 'TNHH1',
  mainIndustry: '6201',
  licenseDate: '2020-01-15',
  province: 'HCM',
  ward: 'TAN_DINH',
  address: '12 Nguyễn Huệ',
  email: 'contact@abc.vn',
});

describe('EnterpriseService', () => {
  let service: EnterpriseService;
  let repository: Record<string, any>;
  let userService: Record<string, any>;
  let transactionManager: Record<string, any>;
  let dataSource: Record<string, any>;

  beforeEach(() => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    userService = {
      findByUsername: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
    };
    transactionManager = {
      create: vi.fn((_: unknown, values: Record<string, unknown>) => values),
      save: vi.fn(async (entity: Record<string, unknown>) =>
        entity.username ? entity : { ...entity, id: 10, createdAt: new Date(), updatedAt: new Date() },
      ),
    };
    dataSource = {
      transaction: vi.fn((callback: (manager: typeof transactionManager) => unknown) =>
        callback(transactionManager),
      ),
    };
    service = new EnterpriseService(
      repository as any,
      userService as any,
      { get: vi.fn().mockReturnValue(2) } as any,
      dataSource as any,
    );
  });

  it('creates an enterprise and its account using tax code and password 1-8', async () => {
    const result = await service.create(createDto(), 7);

    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(transactionManager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taxCode: '0101234567', createdBy: 7 }),
    );
    expect(transactionManager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        username: '0101234567',
        passwordHash: 'hashed-initial-password',
        enterpriseId: 10,
        roleId: 2,
      }),
    );
    expect(result).toMatchObject({ id: 10, taxCode: '0101234567' });
  });

  it('rejects an industry code that is not level 4', async () => {
    await expect(service.create({ ...createDto(), mainIndustry: '62' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a tax code that is already used by a user account', async () => {
    userService.findByUsername.mockResolvedValue({ id: 1 });

    await expect(service.create(createDto())).rejects.toThrow(ConflictException);
  });

  it('soft-deletes an existing enterprise', async () => {
    repository.findOne.mockResolvedValue({ id: 10 });

    await service.remove(10);

    expect(repository.softDelete).toHaveBeenCalledWith(10);
  });
});
