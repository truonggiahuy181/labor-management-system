import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserController } from '../user.controller.js';
import type { UserService } from '../user.service.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import type { UpdateProfileDto } from '../dto/update-profile.dto.js';
import type { UpdateUserDto } from '../dto/update-user.dto.js';
import type { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';

describe('UserController', () => {
  let controller: UserController;
  let userService: Partial<UserService>;

  beforeEach(() => {
    userService = {
      createUser: vi.fn(),
      getAllUsers: vi.fn(),
      getMyProfile: vi.fn(),
      getUserById: vi.fn(),
      updateProfile: vi.fn(),
      updateUser: vi.fn(),
      updateStatus: vi.fn(),
      uploadUserAvatar: vi.fn(),
    };

    controller = new UserController(userService as UserService);
  });

  describe('uploadUserAvatar', () => {
    it('gọi service với user đích và admin hiện tại', async () => {
      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 8,
        buffer: Buffer.alloc(8),
      };
      const response = { id: 2, avatarUrl: 'https://images/avatar.png' };
      (userService.uploadUserAvatar as any).mockResolvedValue(response);

      const result = await controller.uploadUserAvatar(2, { id: 1 }, file);

      expect(userService.uploadUserAvatar).toHaveBeenCalledWith(2, 1, file);
      expect(result).toBe(response);
    });
  });

  describe('getAllUsers', () => {
    it('nên trả về nguyên response do service cung cấp', async () => {
      const mockUsers: any[] = [
        {
          id: 2,
          username: 'admin-vna',
          fullName: 'Nguyễn Văn A',
          dob: null,
          gender: null,
          email: 'admin-vna@example.com',
          phoneNumber: null,
          title: 'Chuyên viên',
          avatarUrl: null,
          provinceId: null,
          districtId: null,
          wardId: null,
          address: null,
          roleId: 2,
          enterpriseId: null,
          isActive: true,
          createdAt: new Date('2026-10-22T08:00:00.000Z'),
          updatedAt: new Date('2026-10-22T08:00:00.000Z'),
        },
      ];
      (userService.getAllUsers as any).mockResolvedValue(mockUsers);

      const currentUser = { id: 1 };
      const query = { search: 'admin', roleId: 2, isActive: true };
      const result = await controller.getAllUsers(currentUser, query);

      expect(userService.getAllUsers).toHaveBeenCalledWith(1, query);
      expect(result).toBe(mockUsers);
    });
  });

  describe('createUser', () => {
    it('nên gọi userService.createUser và trả về thông tin người dùng mới mà không lộ hash/otp', async () => {
      const mockCreatedUser: any = {
        id: 2,
        username: 'admin-vna',
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
        roleId: 1,
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
        roleId: 1,
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

  describe('getUserById', () => {
    it('nên gọi userService.getUserById và trả về response do service cung cấp', async () => {
      const mockUser: any = {
        id: 2,
        username: 'Vna25112020',
        fullName: 'Phan Thanh Tùng',
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
        roleId: 1,
        enterpriseId: null,
        isActive: true,
        createdAt: new Date('2026-10-22T08:00:00.000Z'),
        updatedAt: new Date('2026-10-22T08:00:00.000Z'),
      };

      (userService.getUserById as any).mockResolvedValue(mockUser);

      const result = await controller.getUserById(2);

      expect(userService.getUserById).toHaveBeenCalledWith(2);
      expect(result.id).toBe(2);
      expect(result.username).toBe('Vna25112020');
      expect(result.fullName).toBe('Phan Thanh Tùng');
    });
  });

  describe('updateMyProfile', () => {
    it('nên gọi userService.updateProfile và trả về thông tin đã cập nhật an toàn', async () => {
      const mockUpdatedUser: any = {
        id: 1,
        username: 'admin',
        fullName: 'Nguyễn Văn A (Updated)',
        dob: new Date('1990-01-01'),
        gender: 1,
        email: 'admin@example.com',
        phoneNumber: '0988888888',
        title: 'Giám đốc',
        avatarUrl: 'https://example.com/avatar.jpg',
        provinceId: '01',
        districtId: '001',
        wardId: '00001',
        address: 'Hà Nội',
        roleId: 1,
        enterpriseId: null,
        isActive: true,
        createdAt: new Date('2026-10-18T10:00:00.000Z'),
        updatedAt: new Date('2026-10-25T12:00:00.000Z'),
      };

      (userService.updateProfile as any).mockResolvedValue(mockUpdatedUser);

      const dto: UpdateProfileDto = {
        fullName: 'Nguyễn Văn A (Updated)',
        phoneNumber: '0988888888',
      };

      const currentUser = { id: 1 };
      const result = await controller.updateMyProfile(currentUser, dto);

      expect(userService.updateProfile).toHaveBeenCalledWith(1, dto);
      expect(result.id).toBe(1);
      expect(result.fullName).toBe('Nguyễn Văn A (Updated)');
      expect(result.phoneNumber).toBe('0988888888');
      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('nên gọi userService.updateUser với id và trả về response qua UserMapper', async () => {
      const mockUpdatedUser: any = {
        id: 2,
        username: 'employee1',
        fullName: 'Nhân viên 1 (Updated)',
        dob: new Date('1995-01-01'),
        gender: 0,
        email: 'employee1.new@example.com',
        phoneNumber: '0901234567',
        title: 'Chuyên viên',
        avatarUrl: null,
        provinceId: '79',
        districtId: '764',
        wardId: '26740',
        address: 'TP.HCM',
        roleId: 2,
        enterpriseId: 10,
        isActive: false,
        createdAt: new Date('2026-10-20T10:00:00.000Z'),
        updatedAt: new Date('2026-10-25T12:00:00.000Z'),
      };

      (userService.updateUser as any).mockResolvedValue(mockUpdatedUser);

      const dto: UpdateUserDto = {
        fullName: 'Nhân viên 1 (Updated)',
        email: 'employee1.new@example.com',
        isActive: false,
      };

      const currentUser = { id: 1 };
      const result = await controller.updateUser(2, currentUser, dto);

      expect(userService.updateUser).toHaveBeenCalledWith(2, dto, 1);
      expect(result.id).toBe(2);
      expect(result.email).toBe('employee1.new@example.com');
      expect(result.enterpriseId).toBe(10);
      expect(result.isActive).toBe(false);
      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('updateUserStatus', () => {
    it('nên gọi userService.updateStatus với id và isActive rồi trả về response qua UserMapper', async () => {
      const mockUpdatedUser: any = {
        id: 2,
        username: 'employee1',
        fullName: 'Nhân viên 1',
        dob: new Date('1995-01-01'),
        gender: 0,
        email: 'employee1@example.com',
        phoneNumber: '0901234567',
        title: 'Chuyên viên',
        avatarUrl: null,
        provinceId: '79',
        districtId: '764',
        wardId: '26740',
        address: 'TP.HCM',
        roleId: 2,
        enterpriseId: 10,
        isActive: false,
        createdAt: new Date('2026-10-20T10:00:00.000Z'),
        updatedAt: new Date('2026-10-25T13:00:00.000Z'),
      };

      (userService.updateStatus as any).mockResolvedValue(mockUpdatedUser);

      const dto: UpdateUserStatusDto = {
        isActive: false,
      };

      const currentUser = { id: 1 };
      const result = await controller.updateUserStatus(2, currentUser, dto);

      expect(userService.updateStatus).toHaveBeenCalledWith(2, false, 1);
      expect(result.id).toBe(2);
      expect(result.isActive).toBe(false);
      expect((result as any).passwordHash).toBeUndefined();
    });
  });
});
