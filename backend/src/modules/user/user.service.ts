import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UserEntity } from './user.entity.js';
import { BaseService } from '../../commons/bases/base.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserMapper, UserResponse } from './user.mapper.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';
import { RoleService } from '../role/role.service.js';
import { ErrorCode } from '../../commons/constants/error-codes.js';

@Injectable()
export class UserService extends BaseService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
    private readonly roleService: RoleService,
  ) {
    super(userRepository);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByResetToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });
  }

  /**
   * Lấy danh sách tất cả người dùng, sắp xếp theo tài khoản tạo mới nhất.
   */
  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.findAll({ order: { id: 'DESC' } });
    return UserMapper.toResponseList(users);
  }

  /**
   * Lấy chi tiết thông tin người dùng theo ID
   */
  async getUserById(id: number): Promise<UserResponse> {
    const user = await this.findOneOrFail({ where: { id } });
    return UserMapper.toResponse(user);
  }

  async getMyProfile(userId: number): Promise<UserResponse> {
    const user = await this.findOneOrFail({ where: { id: userId } });
    return UserMapper.toResponse(user);
  }

  async createUser(
    dto: CreateUserDto,
    creatorId?: number,
  ): Promise<UserResponse> {
    // 1. Kiểm tra username đã tồn tại chưa
    const existingUsername = await this.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException('Tên đăng nhập đã tồn tại trong hệ thống.');
    }

    // 2. Kiểm tra email đã tồn tại chưa
    if (dto.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('Email đã tồn tại trong hệ thống.');
      }
    }

    await this.assertReferences(dto.roleId, dto.enterpriseId);

    // 3. Băm mật khẩu bằng Argon2
    const passwordHash = await argon2.hash(dto.password);

    // 4. Map DTO sang Entity và lưu
    const newUser = this.userRepository.create(
      UserMapper.toEntity(dto, passwordHash, creatorId),
    );

    const savedUser = await this.userRepository.save(newUser);
    return UserMapper.toResponse(savedUser);
  }

  /**
   * Người dùng tự cập nhật thông tin cá nhân
   */
  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    await this.findOneOrFail({ where: { id: userId } });

    const updateData: Partial<UserEntity> = {
      fullName: dto.fullName,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      gender: dto.gender,
      phoneNumber: dto.phoneNumber,
      title: dto.title,
      avatarUrl: dto.avatarUrl,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      wardId: dto.wardId,
      address: dto.address,
      updatedBy: userId,
    };

    // Loại bỏ các trường undefined để chỉ cập nhật trường được gửi lên
    Object.keys(updateData).forEach(
      (key) =>
        (updateData as any)[key] === undefined &&
        delete (updateData as any)[key],
    );

    const updatedUser = await this.update(userId, updateData);
    return UserMapper.toResponse(updatedUser);
  }

  /**
   * Quản trị viên cập nhật người dùng theo ID (bao gồm vai trò, trạng thái, reset mật khẩu, v.v.)
   */
  async updateUser(
    id: number,
    dto: UpdateUserDto,
    adminId?: number,
  ): Promise<UserResponse> {
    const user = await this.findOneOrFail({ where: { id } });

    // 1. Kiểm tra email nếu có thay đổi và tránh trùng lặp với user khác
    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email đã tồn tại trong hệ thống.');
      }
    }
    await this.assertReferences(dto.roleId, dto.enterpriseId);

    // 2. Chuẩn bị dữ liệu cập nhật
    const updateData: Partial<UserEntity> = {
      fullName: dto.fullName,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      gender: dto.gender,
      phoneNumber: dto.phoneNumber,
      title: dto.title,
      avatarUrl: dto.avatarUrl,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      wardId: dto.wardId,
      address: dto.address,
      roleId: dto.roleId,
      enterpriseId: dto.enterpriseId,
      isActive: dto.isActive,
      email: dto.email,
      updatedBy: adminId ?? null,
    };

    // 3. Nếu có đặt lại mật khẩu, băm bằng Argon2 và cập nhật passwordChangedAt để huỷ phiên cũ
    if (dto.password) {
      updateData.passwordHash = await argon2.hash(dto.password);
      updateData.passwordChangedAt = new Date();
    }

    // Loại bỏ các trường undefined
    Object.keys(updateData).forEach(
      (key) =>
        (updateData as any)[key] === undefined &&
        delete (updateData as any)[key],
    );

    const updatedUser = await this.update(id, updateData);
    return UserMapper.toResponse(updatedUser);
  }

  /**
   * Quản trị viên cập nhật trạng thái hoạt động (is_active) của tài khoản người dùng
   */
  async updateStatus(
    id: number,
    isActive: boolean,
    adminId?: number,
  ): Promise<UserResponse> {
    // 1. Không cho phép tự khóa tài khoản của chính mình
    if (adminId && id === adminId && !isActive) {
      throw new BadRequestException(
        'Bạn không thể tự khóa tài khoản của chính mình.',
      );
    }

    // 2. Kiểm tra người dùng có tồn tại không
    await this.findOneOrFail({ where: { id } });

    // 3. Cập nhật trạng thái
    const updatedUser = await this.update(id, {
      isActive,
      updatedBy: adminId ?? null,
    });
    return UserMapper.toResponse(updatedUser);
  }

  private async assertReferences(
    roleId?: number,
    enterpriseId?: number | null,
  ): Promise<void> {
    if (roleId !== undefined) {
      await this.roleService.getByIdOrFail(roleId);
    }

    if (enterpriseId !== undefined && enterpriseId !== null) {
      const enterpriseExists = await this.enterpriseRepository.exists({
        where: { id: enterpriseId },
      });
      if (!enterpriseExists) {
        throw new BadRequestException({
          code: ErrorCode.ENTERPRISE_NOT_FOUND,
          message: 'Doanh nghiệp không tồn tại.',
        });
      }
    }
  }
}
