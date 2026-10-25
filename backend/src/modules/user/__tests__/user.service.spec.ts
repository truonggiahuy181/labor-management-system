import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UserService } from '../user.service.js';
import type { UserEntity } from '../user.entity.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import type { UpdateProfileDto } from '../dto/update-profile.dto.js';
import type { UpdateUserDto } from '../dto/update-user.dto.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_argon2_password'),
  verify: vi.fn().mockResolvedValue(true),
}));

describe('UserService', () => {
  let service: UserService;
  let repository: Partial<Repository<UserEntity>>;
  let enterpriseRepository: { exists: ReturnType<typeof vi.fn> };
  let roleService: { getByIdOrFail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
      save: vi.fn().mockImplementation(async (entity) => entity),
      update: vi.fn().mockResolvedValue({ affected: 1 } as any),
    };

    enterpriseRepository = {
      exists: vi.fn().mockResolvedValue(true),
    };
    roleService = {
      getByIdOrFail: vi.fn().mockResolvedValue({ id: 1 }),
    };

    service = new UserService(
      repository as Repository<UserEntity>,
      enterpriseRepository as any,
      roleService as any,
    );
  });

  describe('getAllUsers', () => {
    it('nên trả về danh sách người dùng theo ID giảm dần', async () => {
      const mockUsers: any[] = [
        { id: 2, username: 'new-user', passwordHash: 'secret' },
        { id: 1, username: 'old-user', passwordHash: 'secret' },
      ];
      (repository.find as any).mockResolvedValue(mockUsers);

      const result = await service.getAllUsers();

      expect(repository.find).toHaveBeenCalledWith({ order: { id: 'DESC' } });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 2, username: 'new-user' });
      expect((result[0] as any).passwordHash).toBeUndefined();
    });
  });

  describe('createUser', () => {
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

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { username: 'admin-vna' },
      });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'phanthanhthung093@gmail.com' },
      });
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
      expect(result).toMatchObject({
        id: 10,
        username: 'admin-vna',
        fullName: 'Nguyễn Văn A',
      });
      expect((result as any).passwordHash).toBeUndefined();
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

      await expect(service.createUser(dto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createUser(dto, 1)).rejects.toThrow(
        'Tên đăng nhập đã tồn tại trong hệ thống.',
      );
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

      await expect(service.createUser(dto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createUser(dto, 1)).rejects.toThrow(
        'Email đã tồn tại trong hệ thống.',
      );
    });

    it('nên từ chối roleId không tồn tại', async () => {
      (repository.findOne as any).mockResolvedValue(null);
      roleService.getByIdOrFail.mockRejectedValue(
        new BadRequestException('Vai trò không tồn tại.'),
      );

      await expect(
        service.createUser(
          {
            username: 'new-user',
            password: 'PlainPassword123',
            fullName: 'Người dùng mới',
            email: 'new-user@example.com',
            roleId: 999,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('nên từ chối enterpriseId không tồn tại', async () => {
      (repository.findOne as any).mockResolvedValue(null);
      enterpriseRepository.exists.mockResolvedValue(false);

      await expect(
        service.createUser(
          {
            username: 'enterprise-user',
            password: 'PlainPassword123',
            fullName: 'Người dùng doanh nghiệp',
            email: 'enterprise-user@example.com',
            roleId: 2,
            enterpriseId: 999,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('nên trả về chi tiết người dùng khi tìm thấy theo ID', async () => {
      const mockUser: any = {
        id: 2,
        username: 'Vna25112020',
        passwordHash: 'secret',
        fullName: 'Phan Thanh Tùng',
        email: 'phanthanhthung093@gmail.com',
      };

      (repository.findOne as any).mockResolvedValue(mockUser);

      const result = await service.getUserById(2);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(result.id).toBe(2);
      expect(result.username).toBe('Vna25112020');
      expect(result.fullName).toBe('Phan Thanh Tùng');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('nên ném NotFoundException nếu không tìm thấy người dùng theo ID', async () => {
      (repository.findOne as any).mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyProfile', () => {
    it('nên trả về hồ sơ đã được map an toàn', async () => {
      const mockUser: any = {
        id: 1,
        username: 'admin',
        passwordHash: 'secret',
        fullName: 'Quản trị viên',
      };
      (repository.findOne as any).mockResolvedValue(mockUser);

      const result = await service.getMyProfile(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toMatchObject({ id: 1, username: 'admin' });
      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('nên cập nhật thông tin cá nhân thành công và parse ngày sinh', async () => {
      const mockUser: any = {
        id: 1,
        username: 'admin',
        fullName: 'Nguyễn Văn A',
        dob: new Date('1990-01-01'),
      };

      (repository.findOne as any).mockResolvedValue(mockUser);

      const dto: UpdateProfileDto = {
        fullName: 'Nguyễn Văn A (Updated)',
        dob: '1995-05-20',
        phoneNumber: '0988888888',
      };

      const result = await service.updateProfile(1, dto);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          fullName: 'Nguyễn Văn A (Updated)',
          dob: new Date('1995-05-20'),
          phoneNumber: '0988888888',
          updatedBy: 1,
        }),
      );
      expect(result).toBeDefined();
    });

    it('nên ném NotFoundException nếu không tìm thấy người dùng', async () => {
      (repository.findOne as any).mockResolvedValue(null);

      const dto: UpdateProfileDto = { fullName: 'Tên mới' };

      await expect(service.updateProfile(999, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('nên cập nhật vai trò, trạng thái, doanh nghiệp và mật khẩu mới', async () => {
      const mockUser: any = {
        id: 2,
        username: 'employee1',
        email: 'old@example.com',
        roleId: 2,
        isActive: true,
      };

      (repository.findOne as any).mockImplementation(async ({ where }: any) => {
        if (where?.id === 2) return mockUser;
        if (where?.email === 'new@example.com') return null;
        return null;
      });

      const dto: UpdateUserDto = {
        fullName: 'Nhân viên 1 (Cập nhật)',
        email: 'new@example.com',
        roleId: 1,
        isActive: false,
        enterpriseId: 5,
        password: 'NewStrongPassword123',
      };

      const result = await service.updateUser(2, dto, 1);

      expect(repository.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          fullName: 'Nhân viên 1 (Cập nhật)',
          email: 'new@example.com',
          roleId: 1,
          isActive: false,
          enterpriseId: 5,
          passwordHash: 'hashed_argon2_password',
          updatedBy: 1,
        }),
      );
      expect(result).toBeDefined();
    });

    it('nên ném ConflictException nếu email mới đã bị người dùng khác sử dụng', async () => {
      const mockCurrentUser: any = {
        id: 2,
        username: 'employee1',
        email: 'emp1@example.com',
      };

      const mockAnotherUser: any = {
        id: 3,
        username: 'employee2',
        email: 'taken@example.com',
      };

      (repository.findOne as any).mockImplementation(async ({ where }: any) => {
        if (where?.id === 2) return mockCurrentUser;
        if (where?.email === 'taken@example.com') return mockAnotherUser;
        return null;
      });

      const dto: UpdateUserDto = {
        email: 'taken@example.com',
      };

      await expect(service.updateUser(2, dto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateUser(2, dto, 1)).rejects.toThrow(
        'Email đã tồn tại trong hệ thống.',
      );
    });

    it('nên từ chối roleId không tồn tại trước khi cập nhật', async () => {
      (repository.findOne as any).mockResolvedValue({
        id: 2,
        email: 'user@example.com',
      });
      roleService.getByIdOrFail.mockRejectedValue(
        new BadRequestException('Vai trò không tồn tại.'),
      );

      await expect(service.updateUser(2, { roleId: 999 }, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('nên từ chối enterpriseId không tồn tại trước khi cập nhật', async () => {
      (repository.findOne as any).mockResolvedValue({
        id: 2,
        email: 'user@example.com',
      });
      enterpriseRepository.exists.mockResolvedValue(false);

      await expect(
        service.updateUser(2, { enterpriseId: 999 }, 1),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('nên cập nhật trạng thái hoạt động của người dùng thành công', async () => {
      const mockUser: any = {
        id: 2,
        username: 'employee1',
        isActive: true,
      };

      (repository.findOne as any).mockResolvedValue(mockUser);

      const result = await service.updateStatus(2, false, 1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(repository.update).toHaveBeenCalledWith(2, {
        isActive: false,
        updatedBy: 1,
      });
      expect(result).toBeDefined();
    });

    it('nên ném BadRequestException nếu Quản trị viên tự khóa tài khoản của chính mình', async () => {
      await expect(service.updateStatus(1, false, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateStatus(1, false, 1)).rejects.toThrow(
        'Bạn không thể tự khóa tài khoản của chính mình.',
      );
    });

    it('nên cho phép Quản trị viên kích hoạt lại tài khoản của chính mình (nếu isActive = true)', async () => {
      const mockUser: any = { id: 1, username: 'admin', isActive: false };
      (repository.findOne as any).mockResolvedValue(mockUser);

      const result = await service.updateStatus(1, true, 1);

      expect(repository.update).toHaveBeenCalledWith(1, {
        isActive: true,
        updatedBy: 1,
      });
      expect(result).toBeDefined();
    });

    it('nên ném NotFoundException nếu người dùng không tồn tại', async () => {
      (repository.findOne as any).mockResolvedValue(null);

      await expect(service.updateStatus(999, false, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
