import { describe, it, expect } from 'vitest';
import { UserMapper } from '../user.mapper.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import type { UserEntity } from '../user.entity.js';

describe('UserMapper', () => {
  describe('toEntity', () => {
    it('nên ánh xạ chính xác từ CreateUserDto sang Entity object', () => {
      const dto: CreateUserDto = {
        username: 'admin-vna',
        password: 'Password@123',
        fullName: 'Nguyễn Văn A',
        dob: '1995-06-01',
        gender: 1,
        email: 'phanthanhthung093@gmail.com',
        phoneNumber: '0901234567',
        title: 'Chuyên viên',
        provinceId: '79',
        districtId: '764',
        wardId: '26740',
        address: 'Phường Gò Vấp, TP Hồ Chí Minh',
        roleId: 1,
        isActive: true,
      };

      const entity = UserMapper.toEntity(dto, 'argon2_hashed_pw', 99);

      expect(entity.username).toBe('admin-vna');
      expect(entity.passwordHash).toBe('argon2_hashed_pw');
      expect(entity.fullName).toBe('Nguyễn Văn A');
      expect(entity.dob).toEqual(new Date('1995-06-01'));
      expect(entity.gender).toBe(1);
      expect(entity.email).toBe('phanthanhthung093@gmail.com');
      expect(entity.roleId).toBe(1);
      expect(entity.enterpriseId).toBeNull();
      expect(entity.createdBy).toBe(99);
      expect(entity.updatedBy).toBe(99);
      expect(entity.isActive).toBe(true);
    });

    it('nên gán giá trị mặc định khi một số trường tùy chọn không truyền', () => {
      const dto: CreateUserDto = {
        username: 'simple-user',
        password: 'Password@123',
        fullName: 'Trần Văn B',
        email: 'tranvanb@gmail.com',
        roleId: 3,
      };

      const entity = UserMapper.toEntity(dto, 'hashed_pw');

      expect(entity.dob).toBeNull();
      expect(entity.gender).toBeNull();
      expect(entity.phoneNumber).toBeNull();
      expect(entity.title).toBeNull();
      expect(entity.avatarObjectKey).toBeNull();
      expect(entity.isActive).toBe(true);
      expect(entity.createdBy).toBeNull();
      expect(entity.updatedBy).toBeNull();
    });
  });

  describe('toResponse & toResponseList', () => {
    it('nên loại bỏ các trường nhạy cảm và trả về đúng UserResponse', () => {
      const mockEntity: any = {
        id: 1,
        username: 'admin-vna',
        passwordHash: 'secret_hash',
        resetPasswordToken: 'otp_token',
        resetPasswordExpires: new Date(),
        emailChangeOtp: '123456',
        fullName: 'Nguyễn Văn A',
        dob: new Date('1995-06-01'),
        gender: 1,
        email: 'phanthanhthung093@gmail.com',
        phoneNumber: '0901234567',
        title: 'Chuyên viên',
        avatarObjectKey: null,
        provinceId: '79',
        districtId: '764',
        wardId: '26740',
        address: 'Gò Vấp',
        roleId: 2,
        enterpriseId: null,
        isActive: true,
        createdAt: new Date('2026-10-22'),
        updatedAt: new Date('2026-10-22'),
      };

      const response = UserMapper.toResponse(mockEntity as UserEntity);

      expect(response.id).toBe(1);
      expect(response.username).toBe('admin-vna');
      expect(response.avatarObjectKey).toBeNull();
      expect(response.avatarUrl).toBeNull();
      expect((response as any).passwordHash).toBeUndefined();
      expect((response as any).resetPasswordToken).toBeUndefined();
      expect((response as any).emailChangeOtp).toBeUndefined();

      const listResponse = UserMapper.toResponseList([
        mockEntity as UserEntity,
      ]);
      expect(listResponse).toHaveLength(1);
      expect(listResponse[0].id).toBe(1);
    });
  });
});
