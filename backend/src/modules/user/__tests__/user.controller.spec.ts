import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserController } from '../user.controller.js';
import type { UserService } from '../user.service.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';

describe('UserController - createUser', () => {
  let controller: UserController;
  let userService: Partial<UserService>;

  beforeEach(() => {
    userService = {
      createUser: vi.fn(),
      findOneOrFail: vi.fn(),
      update: vi.fn(),
    };

    controller = new UserController(userService as UserService);
  });

  it('nên gọi userService.createUser và trả về thông tin người dùng mới mà không lộ hash/otp', async () => {
    const mockCreatedUser: any = {
      id: 2,
      username: 'admin-vna',
      passwordHash: 'secret_hash_not_exposed',
      fullName: 'Nguyễn Văn A',
      dob: new Date('1995-06-01'),
      gender: 1,
      email: 'phanthanhthung093@gmail.com',
      phoneNumber: '0901234567',
      title: 'Chuyên viên',
      avatarUrl: 'https://example.com/avatar.jpg',
      provinceId: '79',
      districtId: '764',
      wardId: '26740',
      address: 'Phường Gò Vấp, TP Hồ Chí Minh',
      roleId: 2,
      enterpriseId: null,
      isActive: true,
      createdAt: new Date('2026-10-22T08:00:00.000Z'),
      updatedAt: new Date('2026-10-22T08:00:00.000Z'),
    };

    (userService.createUser as any).mockResolvedValue(mockCreatedUser);

    const dto: CreateUserDto = {
      username: 'admin-vna',
      password: 'PlainPassword123',
      fullName: 'Nguyễn Văn A',
      email: 'phanthanhthung093@gmail.com',
      roleId: 2,
      dob: '1995-06-01',
      gender: 1,
      title: 'Chuyên viên',
      avatarUrl: 'https://example.com/avatar.jpg',
      provinceId: '79',
      districtId: '764',
      wardId: '26740',
      address: 'Phường Gò Vấp, TP Hồ Chí Minh',
      isActive: true,
    };

    const currentUser = { id: 1 };
    const result = await controller.createUser(currentUser, dto);

    expect(userService.createUser).toHaveBeenCalledWith(dto, 1);
    expect(result.id).toBe(2);
    expect(result.username).toBe('admin-vna');
    expect(result.fullName).toBe('Nguyễn Văn A');
    expect((result as any).passwordHash).toBeUndefined();
  });
});
