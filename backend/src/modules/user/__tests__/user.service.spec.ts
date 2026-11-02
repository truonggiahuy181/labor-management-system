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
  let roleService: { getByIdOrFail: ReturnType<typeof vi.fn> };
  let fileService: {
    assertOwnedAvatarObjectKey: ReturnType<typeof vi.fn>;
    getAvatarAccessUrl: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
  };
  let locationService: {
    assertValidSelection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
      save: vi.fn().mockImplementation(async (entity) => entity),
      update: vi.fn().mockResolvedValue({ affected: 1 } as any),
      softDelete: vi.fn().mockResolvedValue({ affected: 1 } as any),
    };

    roleService = {
      getByIdOrFail: vi.fn().mockResolvedValue({
        id: 1,
        roleCode: 'ADMIN',
      }),
    };

    fileService = {
      assertOwnedAvatarObjectKey: vi.fn(),
      getAvatarAccessUrl: vi
        .fn()
        .mockResolvedValue('https://images.example.com/avatars/1/avatar.png'),
      upload: vi.fn(),
    };
    locationService = {
      assertValidSelection: vi.fn().mockResolvedValue(undefined),
    };

    service = new UserService(
      repository as Repository<UserEntity>,
      roleService as any,
      fileService as any,
      locationService as any,
    );
  });

  describe('authentication lookups', () => {
    it('loads role and enterprise when finding a user by username', async () => {
      (repository.findOne as any).mockResolvedValue({ id: 1 });

      await service.findForAuthenticationByUsername('admin');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { username: 'admin' },
        relations: { role: true, enterprise: true },
      });
    });

    it('loads role and enterprise when finding a user by id', async () => {
      (repository.findOne as any).mockResolvedValue({ id: 1 });

      await service.findForAuthenticationById(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { role: true, enterprise: true },
      });
    });
  });

  describe('getAllUsers', () => {
    it('nên trả về danh sách người dùng theo ID giảm dần', async () => {
      const mockUsers: any[] = [
        { id: 2, username: 'new-user', passwordHash: 'secret' },
        { id: 1, username: 'old-user', passwordHash: 'secret' },
      ];
      (repository.find as any).mockResolvedValue(mockUsers);

      const result = await service.getAllUsers(1);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          id: expect.objectContaining({
            _type: 'not',
            _value: 1,
          }),
        },
        order: { id: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 2, username: 'new-user' });
      expect((result[0] as any).passwordHash).toBeUndefined();
    });

    it('lọc người dùng theo từ khóa, vai trò, doanh nghiệp và trạng thái', async () => {
      (repository.find as any).mockResolvedValue([]);

      await service.getAllUsers(1, {
        search: 'nguyen',
        roleId: 2,
        enterpriseId: 10,
        isActive: false,
      });

      const call = (repository.find as any).mock.calls[0][0];
      expect(call.order).toEqual({ id: 'DESC' });
      expect(call.where).toHaveLength(4);
      expect(call.where).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            roleId: 2,
            enterpriseId: 10,
            isActive: false,
            username: expect.objectContaining({
              _type: 'ilike',
              _value: '%nguyen%',
            }),
          }),
          expect.objectContaining({
            fullName: expect.objectContaining({
              _type: 'ilike',
              _value: '%nguyen%',
            }),
          }),
          expect.objectContaining({
            email: expect.objectContaining({
              _type: 'ilike',
              _value: '%nguyen%',
            }),
          }),
          expect.objectContaining({
            phoneNumber: expect.objectContaining({
              _type: 'ilike',
              _value: '%nguyen%',
            }),
          }),
        ]),
      );
      for (const where of call.where) {
        expect(where.id).toEqual(
          expect.objectContaining({ _type: 'not', _value: 1 }),
        );
      }
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
        roleId: 1,
        dob: '1995-06-01',
        gender: 1,
        title: 'Chuyên viên',
        isActive: true,
      };

      const result = await service.createUser(dto, 1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { username: 'admin-vna' },
        withDeleted: true,
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
          roleId: 1,
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

    it('không cho tạo ENTERPRISE_USER qua API user', async () => {
      (repository.findOne as any).mockResolvedValue(null);
      roleService.getByIdOrFail.mockResolvedValue({
        id: 2,
        roleCode: 'ENTERPRISE_USER',
      });

      await expect(
        service.createUser(
          {
            username: 'enterprise-user',
            password: 'PlainPassword123',
            fullName: 'Người dùng doanh nghiệp',
            email: 'enterprise-user@example.com',
            roleId: 2,
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

    it('nên trả URL public khi tài khoản có avatarObjectKey', async () => {
      const avatarObjectKey =
        'avatars/1/2026/10/550e8400-e29b-41d4-a716-446655440000.png';
      (repository.findOne as any).mockResolvedValue({
        id: 1,
        username: 'admin',
        avatarObjectKey,
      });

      const result = await service.getMyProfile(1);

      expect(fileService.getAvatarAccessUrl).toHaveBeenCalledWith(
        avatarObjectKey,
      );
      expect(result).toMatchObject({
        avatarObjectKey,
        avatarUrl: 'https://images.example.com/avatars/1/avatar.png',
      });
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

    it('chỉ lưu avatarObjectKey thuộc đúng người dùng', async () => {
      const avatarObjectKey =
        'avatars/1/2026/10/550e8400-e29b-41d4-a716-446655440000.png';
      (repository.findOne as any).mockResolvedValue({
        id: 1,
        username: 'admin',
        avatarObjectKey,
      });

      await service.updateProfile(1, { avatarObjectKey });

      expect(fileService.assertOwnedAvatarObjectKey).toHaveBeenCalledWith(
        avatarObjectKey,
        1,
      );
      expect(repository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ avatarObjectKey }),
      );
    });
  });

  describe('uploadMyAvatar', () => {
    it('upload và tự gắn avatar vào tài khoản hiện tại', async () => {
      const avatarObjectKey =
        'avatars/1/2026/10/550e8400-e29b-41d4-a716-446655440000.png';
      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 8,
        buffer: Buffer.alloc(8),
      };
      (repository.findOne as any).mockResolvedValue({
        id: 1,
        username: 'admin',
        avatarObjectKey,
      });
      fileService.upload.mockResolvedValue({ objectKey: avatarObjectKey });

      const result = await service.uploadMyAvatar(1, file);

      expect(fileService.upload).toHaveBeenCalledWith(file, 'avatars', 1);
      expect(repository.update).toHaveBeenCalledWith(1, {
        avatarObjectKey,
        updatedBy: 1,
      });
      expect(result.avatarUrl).toBe(
        'https://images.example.com/avatars/1/avatar.png',
      );
    });

    it('cho phép quản trị viên upload avatar cho người dùng khác', async () => {
      const avatarObjectKey =
        'avatars/2/2026/10/550e8400-e29b-41d4-a716-446655440000.png';
      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 8,
        buffer: Buffer.alloc(8),
      };
      (repository.findOne as any).mockResolvedValue({
        id: 2,
        username: 'user',
        avatarObjectKey,
      });
      fileService.upload.mockResolvedValue({ objectKey: avatarObjectKey });

      await service.uploadUserAvatar(2, 1, file);

      expect(fileService.upload).toHaveBeenCalledWith(file, 'avatars', 2);
      expect(repository.update).toHaveBeenCalledWith(2, {
        avatarObjectKey,
        updatedBy: 1,
      });
    });
  });

  describe('updateUser', () => {
    it('nên cập nhật hồ sơ, trạng thái và mật khẩu mới', async () => {
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
        isActive: false,
        password: 'NewStrongPassword123',
      };

      const result = await service.updateUser(2, dto, 1);

      expect(repository.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          fullName: 'Nhân viên 1 (Cập nhật)',
          email: 'new@example.com',
          isActive: false,
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

    it('đổi email tài khoản doanh nghiệp thì đổi cùng email doanh nghiệp', async () => {
      const mockUser: any = {
        id: 5,
        username: '0100123458',
        email: 'old@abc.vn',
        enterpriseId: 10,
      };
      (repository.findOne as any).mockImplementation(async ({ where }: any) =>
        where?.id === 5 ? mockUser : null,
      );
      const manager = { update: vi.fn() };
      (repository as any).manager = {
        transaction: vi.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
      };

      await service.updateUser(5, { email: ' New@ABC.vn ' }, 1);

      expect(manager.update).toHaveBeenCalledWith(
        expect.anything(),
        5,
        expect.objectContaining({ email: 'new@abc.vn', updatedBy: 1 }),
      );
      expect(manager.update).toHaveBeenCalledWith(
        expect.anything(),
        { id: 10, taxCode: '0100123458' },
        { email: 'new@abc.vn', updatedBy: 1 },
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('không cho thay đổi roleId khi gọi service trực tiếp', async () => {
      (repository.findOne as any).mockResolvedValue({
        id: 2,
        email: 'user@example.com',
      });

      await expect(
        service.updateUser(2, { roleId: 1 } as any, 1),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('không cho thay đổi enterpriseId khi gọi service trực tiếp', async () => {
      (repository.findOne as any).mockResolvedValue({
        id: 2,
        email: 'user@example.com',
      });

      await expect(
        service.updateUser(2, { enterpriseId: 10 } as any, 1),
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

  describe('remove', () => {
    it('không cho phép người dùng tự xóa tài khoản đang đăng nhập', async () => {
      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('không cho phép xóa tài khoản còn active', async () => {
      (repository.findOne as any).mockResolvedValue({
        id: 2,
        isActive: true,
      });

      await expect(service.remove(2, 1)).rejects.toThrow(BadRequestException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('xóa mềm tài khoản inactive', async () => {
      (repository.findOne as any).mockResolvedValue({
        id: 2,
        isActive: false,
      });

      await expect(service.remove(2, 1)).resolves.toBeUndefined();
      expect(repository.softDelete).toHaveBeenCalledWith(2);
    });
  });
});
