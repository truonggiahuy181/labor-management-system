import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UserEntity } from './user.entity.js';
import { BaseService } from '../../commons/bases/base.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserMapper, UserResponse } from './user.mapper.js';
import { RoleService } from '../role/role.service.js';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { FileService } from '../file/file.service.js';

@Injectable()
export class UserService extends BaseService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly roleService: RoleService,
    private readonly fileService: FileService,
  ) {
    super(userRepository);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { username },
      withDeleted: true,
    });
  }

  async findForAuthenticationByUsername(
    username: string,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: { role: true, enterprise: true },
    });
  }

  async findForAuthenticationById(id: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: { role: true, enterprise: true },
    });
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
   * Lấy danh sách người dùng khác tài khoản đang đăng nhập, sắp xếp theo ID giảm dần.
   */
  async getAllUsers(
    currentUserId: number,
    query: UserQueryDto = {},
  ): Promise<UserResponse[]> {
    const baseWhere: FindOptionsWhere<UserEntity> = {
      id: Not(currentUserId),
    };
    if (query.roleId !== undefined) {
      baseWhere.roleId = query.roleId;
    }
    if (query.enterpriseId !== undefined) {
      baseWhere.enterpriseId = query.enterpriseId;
    }
    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    }

    const search = query.search?.trim();
    const where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[] =
      search
        ? [
            { ...baseWhere, username: ILike(`%${search}%`) },
            { ...baseWhere, fullName: ILike(`%${search}%`) },
            { ...baseWhere, email: ILike(`%${search}%`) },
            { ...baseWhere, phoneNumber: ILike(`%${search}%`) },
          ]
        : baseWhere;

    const users = await this.findAll({
      where,
      order: { id: 'DESC' },
    });
    return Promise.all(users.map((user) => this.toResponse(user)));
  }

  /**
   * Lấy chi tiết thông tin người dùng theo ID
   */
  async getUserById(id: number): Promise<UserResponse> {
    const user = await this.findOneOrFail({ where: { id } });
    return this.toResponse(user);
  }

  async getMyProfile(userId: number): Promise<UserResponse> {
    const user = await this.findOneOrFail({ where: { id: userId } });
    return this.toResponse(user);
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

    const role = await this.roleService.getByIdOrFail(dto.roleId);
    if (role.roleCode === RoleCode.ENTERPRISE_USER) {
      throw new BadRequestException({
        code: ErrorCode.ENTERPRISE_USER_MUST_BE_CREATED_WITH_ENTERPRISE,
        message: 'Tài khoản doanh nghiệp chỉ được tạo cùng doanh nghiệp.',
      });
    }

    // 3. Băm mật khẩu bằng Argon2
    const passwordHash = await argon2.hash(dto.password);

    // 4. Map DTO sang Entity và lưu
    const newUser = this.userRepository.create(
      UserMapper.toEntity(dto, passwordHash, creatorId),
    );

    const savedUser = await this.userRepository.save(newUser);
    return this.toResponse(savedUser);
  }

  /**
   * Người dùng tự cập nhật thông tin cá nhân
   */
  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    await this.findOneOrFail({ where: { id: userId } });

    if (dto.avatarObjectKey) {
      this.fileService.assertOwnedAvatarObjectKey(dto.avatarObjectKey, userId);
    }

    const updateData: Partial<UserEntity> = {
      fullName: dto.fullName,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      gender: dto.gender,
      phoneNumber: dto.phoneNumber,
      title: dto.title,
      avatarObjectKey: dto.avatarObjectKey,
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
    return this.toResponse(updatedUser);
  }

  async uploadMyAvatar(
    userId: number,
    file: import('../file/file.types.js').MultipartFile | undefined,
  ): Promise<UserResponse> {
    return this.uploadAvatar(userId, userId, file);
  }

  async uploadUserAvatar(
    userId: number,
    adminId: number,
    file: import('../file/file.types.js').MultipartFile | undefined,
  ): Promise<UserResponse> {
    return this.uploadAvatar(userId, adminId, file);
  }

  private async uploadAvatar(
    userId: number,
    updatedBy: number,
    file: import('../file/file.types.js').MultipartFile | undefined,
  ): Promise<UserResponse> {
    await this.findOneOrFail({ where: { id: userId } });
    const uploaded = await this.fileService.upload(file, 'avatars', userId);
    const updatedUser = await this.update(userId, {
      avatarObjectKey: uploaded.objectKey,
      updatedBy,
    });
    return this.toResponse(updatedUser);
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
    if ('roleId' in dto || 'enterpriseId' in dto) {
      throw new BadRequestException({
        code: ErrorCode.USER_ROLE_AND_ENTERPRISE_IMMUTABLE,
        message: 'Không được thay đổi vai trò hoặc doanh nghiệp của tài khoản.',
      });
    }

    if (dto.avatarObjectKey) {
      this.fileService.assertOwnedAvatarObjectKey(dto.avatarObjectKey, id);
    }

    // 2. Chuẩn bị dữ liệu cập nhật
    const updateData: Partial<UserEntity> = {
      fullName: dto.fullName,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      gender: dto.gender,
      phoneNumber: dto.phoneNumber,
      title: dto.title,
      avatarObjectKey: dto.avatarObjectKey,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      wardId: dto.wardId,
      address: dto.address,
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
    return this.toResponse(updatedUser);
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
    return this.toResponse(updatedUser);
  }

  async remove(id: number, currentUserId: number): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException({
        code: ErrorCode.USER_CANNOT_DELETE_SELF,
        message: 'Bạn không thể tự xóa tài khoản đang đăng nhập.',
      });
    }

    const user = await this.findOneOrFail({ where: { id } });
    if (user.isActive) {
      throw new BadRequestException({
        code: ErrorCode.USER_MUST_BE_INACTIVE,
        message: 'Phải khóa tài khoản người dùng trước khi xóa.',
      });
    }

    await this.userRepository.softDelete(id);
  }

  async resolveAvatarUrl(
    avatarObjectKey: string | null,
  ): Promise<string | null> {
    if (!avatarObjectKey) return null;
    return this.fileService.getAvatarAccessUrl(avatarObjectKey);
  }

  private async toResponse(entity: UserEntity): Promise<UserResponse> {
    const avatarUrl = await this.resolveAvatarUrl(entity.avatarObjectKey);
    return UserMapper.toResponse(entity, avatarUrl);
  }
}
