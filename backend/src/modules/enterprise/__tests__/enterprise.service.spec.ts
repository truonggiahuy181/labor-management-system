import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { EnterpriseService } from '../enterprise.service.js';
import type { CreateEnterpriseDto } from '../dto/create-enterprise.dto.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-initial-password'),
}));

const createDto = (): CreateEnterpriseDto => ({
  enterpriseName: 'Công ty TNHH ABC',
  taxCode: '0101234567',
  businessTypeId: 1,
  industryId: 1,
  registrationDate: '2020-01-15',
  provinceId: '79',
  wardId: '26734',
  address: '12 Nguyễn Huệ',
  email: 'contact@abc.vn',
});

const enterpriseEntity = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  enterpriseName: 'Công ty TNHH ABC',
  taxCode: '0101234567',
  businessTypeId: 1,
  industryId: 1,
  registrationDate: '2020-01-15',
  provinceId: '79',
  wardId: '26734',
  address: '12 Nguyễn Huệ',
  foreignName: null,
  email: 'contact@abc.vn',
  phoneNumber: null,
  representativeName: null,
  representativePhone: null,
  operatingProvinceId: null,
  operatingWardId: null,
  operatingAddress: null,
  isActive: true,
  createdAt: new Date('2026-10-25T08:00:00.000Z'),
  updatedAt: new Date('2026-10-25T08:00:00.000Z'),
  ...overrides,
});

describe('EnterpriseService', () => {
  let service: EnterpriseService;
  let repository: Record<string, any>;
  let userRepository: { exists: ReturnType<typeof vi.fn> };
  let userService: Record<string, any>;
  let transactionManager: Record<string, any>;
  let dataSource: Record<string, any>;
  let businessTypeService: Record<string, any>;
  let industryService: Record<string, any>;
  let roleService: Record<string, any>;

  beforeEach(() => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    userRepository = { exists: vi.fn() };
    userService = {
      findByUsername: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
    };
    businessTypeService = {
      getActiveByIdOrFail: vi.fn().mockResolvedValue({ id: 1 }),
    };
    industryService = {
      getLevelFourByIdOrFail: vi.fn().mockResolvedValue({ id: 1 }),
    };
    roleService = {
      getByCodeOrFail: vi.fn().mockResolvedValue({
        id: 2,
        roleCode: 'ENTERPRISE_USER',
      }),
    };
    transactionManager = {
      create: vi.fn((_: unknown, values: Record<string, unknown>) => values),
      save: vi.fn(async (entity: Record<string, unknown>) =>
        entity.username
          ? entity
          : { ...entity, id: 10, createdAt: new Date(), updatedAt: new Date() },
      ),
    };
    dataSource = {
      transaction: vi.fn(
        (callback: (manager: typeof transactionManager) => unknown) =>
          callback(transactionManager),
      ),
    };
    service = new EnterpriseService(
      repository as any,
      userRepository as any,
      businessTypeService as any,
      industryService as any,
      roleService as any,
      userService as any,
      dataSource as any,
    );
  });

  it('creates an enterprise and its account using tax code and password 1-8', async () => {
    const result = await service.create(createDto(), 7);

    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(roleService.getByCodeOrFail).toHaveBeenCalledWith('ENTERPRISE_USER');
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
    expect(result).toEqual({
      enterprise: expect.objectContaining({
        id: 10,
        taxCode: '0101234567',
      }),
      initialAccess: {
        username: '0101234567',
        temporaryPassword: '12345678',
      },
    });
  });

  it('rejects an invalid enterprise role before opening a transaction', async () => {
    roleService.getByCodeOrFail.mockRejectedValue(new BadRequestException());

    await expect(service.create(createDto())).rejects.toThrow(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive business type', async () => {
    businessTypeService.getActiveByIdOrFail.mockRejectedValue(
      new BadRequestException(),
    );

    await expect(service.create(createDto())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a tax code that is already used by a user account', async () => {
    userService.findByUsername.mockResolvedValue({ id: 1 });

    await expect(service.create(createDto())).rejects.toThrow(
      ConflictException,
    );
  });

  it('returns all enterprises ordered by newest ID', async () => {
    repository.find.mockResolvedValue([
      enterpriseEntity({ id: 11 }),
      enterpriseEntity({ id: 10 }),
    ]);

    const result = await service.getAll();

    expect(repository.find).toHaveBeenCalledWith({
      where: {},
      order: { id: 'DESC' },
    });
    expect(result.map((enterprise) => enterprise.id)).toEqual([11, 10]);
  });

  it('filters enterprises by search, catalogue, province and status', async () => {
    repository.find.mockResolvedValue([]);

    await service.getAll({
      search: 'abc',
      businessTypeId: 2,
      industryId: 3,
      provinceId: '79',
      isActive: false,
    });

    const commonFilter = {
      businessTypeId: 2,
      industryId: 3,
      provinceId: '79',
      isActive: false,
    };
    expect(repository.find).toHaveBeenCalledWith({
      where: [
        {
          ...commonFilter,
          enterpriseName: expect.objectContaining({
            _type: 'ilike',
            _value: '%abc%',
          }),
        },
        {
          ...commonFilter,
          taxCode: expect.objectContaining({
            _type: 'ilike',
            _value: '%abc%',
          }),
        },
        {
          ...commonFilter,
          email: expect.objectContaining({
            _type: 'ilike',
            _value: '%abc%',
          }),
        },
        {
          ...commonFilter,
          representativeName: expect.objectContaining({
            _type: 'ilike',
            _value: '%abc%',
          }),
        },
      ],
      order: { id: 'DESC' },
    });
  });

  it('returns an enterprise by ID', async () => {
    repository.findOne.mockResolvedValue(enterpriseEntity());

    await expect(service.getById(10)).resolves.toMatchObject({
      id: 10,
      taxCode: '0101234567',
    });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it('returns ENTERPRISE_NOT_FOUND when the enterprise does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    let error: NotFoundException | undefined;
    try {
      await service.getById(999);
    } catch (caught) {
      error = caught as NotFoundException;
    }

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error?.getResponse()).toMatchObject({
      code: 'ENTERPRISE_NOT_FOUND',
    });
  });

  it('updates enterprise data and validates changed catalogue IDs', async () => {
    const existing = enterpriseEntity();
    repository.findOne.mockImplementation(async () => existing);
    repository.update.mockImplementation(
      async (_id: number, values: Record<string, unknown>) => {
        Object.assign(existing, values);
      },
    );

    const result = await service.update(
      10,
      {
        enterpriseName: 'Công ty ABC cập nhật',
        businessTypeId: 2,
        industryId: 2,
      },
      7,
    );

    expect(businessTypeService.getActiveByIdOrFail).toHaveBeenCalledWith(2);
    expect(industryService.getLevelFourByIdOrFail).toHaveBeenCalledWith(2);
    expect(repository.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        enterpriseName: 'Công ty ABC cập nhật',
        updatedBy: 7,
      }),
    );
    expect(result).toMatchObject({
      enterpriseName: 'Công ty ABC cập nhật',
      email: 'contact@abc.vn',
    });
  });

  it('never updates email even when the service is called directly', async () => {
    const existing = enterpriseEntity();
    repository.findOne.mockResolvedValue(existing);

    await service.update(10, { email: 'new@abc.vn' } as any, 7);

    expect(repository.update).toHaveBeenCalledWith(
      10,
      expect.not.objectContaining({ email: expect.anything() }),
    );
    expect(userService.findByEmail).not.toHaveBeenCalled();
  });

  it('never updates tax code even when the service is called directly', async () => {
    const existing = enterpriseEntity();
    repository.findOne.mockResolvedValue(existing);

    await service.update(
      10,
      { enterpriseName: 'Công ty ABC cập nhật', taxCode: '0109999999' } as any,
      7,
    );

    expect(repository.update).toHaveBeenCalledWith(
      10,
      expect.not.objectContaining({ taxCode: expect.anything() }),
    );
    expect(userService.findByUsername).not.toHaveBeenCalled();
  });

  it('updates enterprise status', async () => {
    const existing = enterpriseEntity();
    repository.findOne.mockImplementation(async () => existing);
    repository.update.mockImplementation(
      async (_id: number, values: Record<string, unknown>) => {
        Object.assign(existing, values);
      },
    );

    const result = await service.updateStatus(10, false, 7);

    expect(repository.update).toHaveBeenCalledWith(10, {
      isActive: false,
      updatedBy: 7,
    });
    expect(result.isActive).toBe(false);
  });

  it('rejects deleting an active enterprise', async () => {
    repository.findOne.mockResolvedValue(enterpriseEntity());

    await expect(service.remove(10)).rejects.toThrow(BadRequestException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('rejects deleting an enterprise with assigned users', async () => {
    repository.findOne.mockResolvedValue(enterpriseEntity({ isActive: false }));
    userRepository.exists.mockResolvedValue(true);

    await expect(service.remove(10)).rejects.toThrow(ConflictException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes an inactive enterprise without assigned users', async () => {
    repository.findOne.mockResolvedValue(enterpriseEntity({ isActive: false }));
    userRepository.exists.mockResolvedValue(false);

    await expect(service.remove(10)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(10);
  });
});
