import { UserEntity } from './user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';

export interface UserResponse {
  id: number;
  username: string;
  fullName: string;
  dob: Date | null;
  gender: number | null;
  email: string | null;
  phoneNumber: string | null;
  title: string | null;
  avatarUrl: string | null;
  provinceId: string | null;
  districtId: string | null;
  wardId: string | null;
  address: string | null;
  roleId: number;
  enterpriseId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserMapper {
  /**
   * Chuyển CreateUserDto thành UserEntity (bao gồm mật khẩu đã băm và creatorId)
   */
  static toEntity(
    dto: CreateUserDto,
    passwordHash: string,
    creatorId?: number,
  ): Partial<UserEntity> {
    return {
      username: dto.username,
      passwordHash,
      fullName: dto.fullName,
      dob: dto.dob ? new Date(dto.dob) : null,
      gender: dto.gender ?? null,
      email: dto.email,
      phoneNumber: dto.phoneNumber ?? null,
      title: dto.title ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      provinceId: dto.provinceId ?? null,
      districtId: dto.districtId ?? null,
      wardId: dto.wardId ?? null,
      address: dto.address ?? null,
      roleId: dto.roleId,
      enterpriseId: dto.enterpriseId ?? null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      createdBy: creatorId ?? null,
      updatedBy: creatorId ?? null,
    };
  }

  /**
   * Chuyển UserEntity thành Response an toàn (ẩn passwordHash, tokens, OTPs)
   */
  static toResponse(entity: UserEntity): UserResponse {
    return {
      id: entity.id,
      username: entity.username,
      fullName: entity.fullName,
      dob: entity.dob,
      gender: entity.gender,
      email: entity.email,
      phoneNumber: entity.phoneNumber,
      title: entity.title,
      avatarUrl: entity.avatarUrl,
      provinceId: entity.provinceId,
      districtId: entity.districtId,
      wardId: entity.wardId,
      address: entity.address,
      roleId: entity.roleId,
      enterpriseId: entity.enterpriseId,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Chuyển danh sách UserEntity thành danh sách UserResponse
   */
  static toResponseList(entities: UserEntity[]): UserResponse[] {
    return entities.map((entity) => this.toResponse(entity));
  }
}
