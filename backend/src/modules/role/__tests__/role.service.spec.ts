import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleService } from '../role.service.js';

describe('RoleService', () => {
  let repository: { findOne: ReturnType<typeof vi.fn> };
  let service: RoleService;

  beforeEach(() => {
    repository = { findOne: vi.fn() };
    service = new RoleService(repository as any);
  });

  it('returns an existing role', async () => {
    repository.findOne.mockResolvedValue({ id: 1, roleCode: 'ADMIN' });

    await expect(service.getByIdOrFail(1)).resolves.toMatchObject({ id: 1 });
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
      where: { roleCode: 'ENTERPRISE_USER' },
    });
  });

  it('rejects a missing role code', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getByCodeOrFail('UNKNOWN')).rejects.toThrow(
      BadRequestException,
    );
  });
});
