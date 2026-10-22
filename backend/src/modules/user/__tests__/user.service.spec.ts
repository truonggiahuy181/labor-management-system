import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UserService } from '../user.service.js';
import type { UserEntity } from '../user.entity.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_argon2_password'),
  verify: vi.fn().mockResolvedValue(true),
}));

describe('UserService - createUser', () => {
  let service: UserService;
  let repository: Partial<Repository<UserEntity>>;

  beforeEach(() => {
    repository = {
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
      save: vi.fn().mockImplementation(async (entity) => entity),
    };

    service = new UserService(repository as Repository<UserEntity>);
  });

  it('nên tạo mới người dùng thành công và băm mật khẩu', async () => {
    (repository.findOne as any).mockResolvedValue(null);

    const dto: CreateUserDto = {
      username: 'admin-vna',
      password: 'PlainPassword123',
      fullName: 'Nguyễn Văn A',
      email: 'phanthanhthung093@gmail.com',
      roleId: 2,
      dob: '1995-06-01',
      gender: 1,
      title: 'Chuyên viên',
      isActive: true,
    };

    const result = await service.createUser(dto, 1);

    expect(repository.findOne).toHaveBeenCalledWith({ where: { username: 'admin-vna' } });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'phanthanhthung093@gmail.com' } });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'admin-vna',
        passwordHash: 'hashed_argon2_password',
        fullName: 'Nguyễn Văn A',
        email: 'phanthanhthung093@gmail.com',
        roleId: 2,
        createdBy: 1,
        updatedBy: 1,
        isActive: true,
      }),
    );
    expect(result.passwordHash).toBe('hashed_argon2_password');
  });

  it('nên ném ConflictException nếu tên đăng nhập đã tồn tại', async () => {
    (repository.findOne as any).mockImplementation(async ({ where }: any) => {
      if (where.username === 'admin-vna') {
        return { id: 1, username: 'admin-vna' };
      }
      return null;
    });

    const dto: CreateUserDto = {
      username: 'admin-vna',
      password: 'PlainPassword123',
      fullName: 'Nguyễn Văn A',
      email: 'phanthanhthung093@gmail.com',
      roleId: 2,
    };

    await expect(service.createUser(dto, 1)).rejects.toThrow(ConflictException);
    await expect(service.createUser(dto, 1)).rejects.toThrow('Tên đăng nhập đã tồn tại trong hệ thống.');
  });

  it('nên ném ConflictException nếu email đã tồn tại', async () => {
    (repository.findOne as any).mockImplementation(async ({ where }: any) => {
      if (where.email === 'phanthanhthung093@gmail.com') {
        return { id: 2, email: 'phanthanhthung093@gmail.com' };
      }
      return null;
    });

    const dto: CreateUserDto = {
      username: 'new-user',
      password: 'PlainPassword123',
      fullName: 'Nguyễn Văn B',
      email: 'phanthanhthung093@gmail.com',
      roleId: 2,
    };

    await expect(service.createUser(dto, 1)).rejects.toThrow(ConflictException);
    await expect(service.createUser(dto, 1)).rejects.toThrow('Email đã tồn tại trong hệ thống.');
  });
});
