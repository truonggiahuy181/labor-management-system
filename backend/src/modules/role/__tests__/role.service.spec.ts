import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleService } from '../role.service.js';

describe('RoleService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let userRepository: { exists: ReturnType<typeof vi.fn> };
  let service: RoleService;

  beforeEach(() => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((values) => values),
      save: vi.fn(async (entity) => ({ id: 3, ...entity })),
      update: vi.fn(),
      delete: vi.fn(),
    };
    userRepository = { exists: vi.fn().mockResolvedValue(false) };
    service = new RoleService(repository as any, userRepository as any);
  });

  it('returns an existing role', async () => {
    repository.findOne.mockResolvedValue({ id: 1, roleCode: 'ADMIN' });

    await expect(service.getByIdOrFail(1)).resolves.toMatchObject({ id: 1 });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1, isActive: true },
    });
  });

  it('rejects a missing role', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getByIdOrFail(999)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns a role by its stable role code', async () => {
    repository.findOne.mockResolvedValue({
      id: 2,
      roleCode: 'ENTERPRISE_USER',
    });

    await expect(
      service.getByCodeOrFail('ENTERPRISE_USER'),
    ).resolves.toMatchObject({ id: 2 });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { roleCode: 'ENTERPRISE_USER', isActive: true },
    });
  });

  it('rejects a missing role code', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getByCodeOrFail('UNKNOWN')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns all roles ordered by role code', async () => {
    repository.find.mockResolvedValue([
      { id: 1, roleCode: 'ADMIN', isActive: true },
      { id: 2, roleCode: 'ENTERPRISE_USER', isActive: true },
    ]);

    await expect(service.getAll()).resolves.toHaveLength(2);
    expect(repository.find).toHaveBeenCalledWith({
      order: { roleCode: 'ASC' },
    });
  });

  it('creates an active role with a normalized code', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ roleCode: ' report_viewer ', roleName: 'Người xem' }),
    ).resolves.toMatchObject({
      id: 3,
      roleCode: 'REPORT_VIEWER',
      roleName: 'Người xem',
      isActive: true,
    });
  });

  it('rejects a duplicate role code', async () => {
    repository.findOne.mockResolvedValue({ id: 3 });

    await expect(
      service.create({ roleCode: 'ADMIN', roleName: 'Quản trị' }),
    ).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('updates only the role name', async () => {
    const role = {
      id: 2,
      roleCode: 'ENTERPRISE_USER',
      roleName: 'Tên cũ',
      isActive: true,
    };
    repository.findOne.mockImplementation(async () => role);
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(role, values);
    });

    const result = await service.update(2, { roleName: 'Tên mới' });

    expect(repository.update).toHaveBeenCalledWith(2, {
      roleName: 'Tên mới',
    });
    expect(result.roleName).toBe('Tên mới');
    expect(result.roleCode).toBe('ENTERPRISE_USER');
  });

  it('deactivates a role without deleting it', async () => {
    const role = {
      id: 2,
      roleCode: 'ENTERPRISE_USER',
      roleName: 'Người dùng doanh nghiệp',
      isActive: true,
    };
    repository.findOne.mockImplementation(async () => role);
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(role, values);
    });

    const result = await service.updateStatus(2, false);

    expect(repository.update).toHaveBeenCalledWith(2, { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('rejects deleting an active role', async () => {
    repository.findOne.mockResolvedValue({ id: 3, isActive: true });

    await expect(service.remove(3)).rejects.toThrow(BadRequestException);
    expect(userRepository.exists).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('rejects deleting an inactive role that is still in use', async () => {
    repository.findOne.mockResolvedValue({ id: 3, isActive: false });
    userRepository.exists.mockResolvedValue(true);

    await expect(service.remove(3)).rejects.toThrow(ConflictException);
    expect(userRepository.exists).toHaveBeenCalledWith({
      where: { roleId: 3 },
    });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deletes an inactive role that is not in use', async () => {
    repository.findOne.mockResolvedValue({ id: 3, isActive: false });

    await expect(service.remove(3)).resolves.toBeUndefined();
    expect(userRepository.exists).toHaveBeenCalledWith({
      where: { roleId: 3 },
    });
    expect(repository.delete).toHaveBeenCalledWith(3);
  });
});
