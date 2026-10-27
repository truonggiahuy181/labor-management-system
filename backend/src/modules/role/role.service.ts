import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { UserEntity } from '../user/user.entity.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RoleQueryDto } from './dto/role-query.dto.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RoleEntity } from './role.entity.js';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getAll(query: RoleQueryDto = {}): Promise<RoleResponseDto[]> {
    const baseWhere: FindOptionsWhere<RoleEntity> = {};
    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    }

    const search = query.search?.trim();
    const where: FindOptionsWhere<RoleEntity> | FindOptionsWhere<RoleEntity>[] =
      search
        ? [
            { ...baseWhere, roleCode: ILike(`%${search}%`) },
            { ...baseWhere, roleName: ILike(`%${search}%`) },
          ]
        : baseWhere;

    return this.roleRepository.find({
      where,
      order: { roleCode: 'ASC' },
    });
  }

  async getById(id: number): Promise<RoleResponseDto> {
    return this.findEntityOrFail(id);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const roleCode = this.normalizeRoleCode(dto.roleCode);
    await this.assertRoleCodeAvailable(roleCode);

    return this.roleRepository.save(
      this.roleRepository.create({
        roleCode,
        roleName: dto.roleName.trim(),
        isActive: true,
      }),
    );
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    await this.findEntityOrFail(id);

    if (dto.roleName !== undefined) {
      await this.roleRepository.update(id, { roleName: dto.roleName.trim() });
    }

    return this.findEntityOrFail(id);
  }

  async updateStatus(id: number, isActive: boolean): Promise<RoleResponseDto> {
    await this.findEntityOrFail(id);
    await this.roleRepository.update(id, { isActive });
    return this.findEntityOrFail(id);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findEntityOrFail(id);
    if (role.isActive) {
      throw new BadRequestException({
        code: ErrorCode.ROLE_MUST_BE_INACTIVE,
        message: 'Phải ngừng sử dụng vai trò trước khi xóa.',
      });
    }

    const isUsed = await this.userRepository.exists({
      where: { roleId: id },
    });
    if (isUsed) {
      throw new ConflictException({
        code: ErrorCode.ROLE_IN_USE,
        message: 'Không thể xóa vai trò đang được người dùng sử dụng.',
      });
    }

    await this.roleRepository.softDelete(id);
  }

  async getByIdOrFail(id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { id, isActive: true },
    });
    if (!role) {
      throw new BadRequestException({
        code: ErrorCode.ROLE_NOT_FOUND,
        message: 'Vai trò không tồn tại hoặc đã ngừng sử dụng.',
      });
    }
    return role;
  }

  async getByCodeOrFail(roleCode: string): Promise<RoleEntity> {
    const normalizedRoleCode = this.normalizeRoleCode(roleCode);
    const role = await this.roleRepository.findOne({
      where: { roleCode: normalizedRoleCode, isActive: true },
    });
    if (!role) {
      throw new BadRequestException({
        code: ErrorCode.ROLE_NOT_FOUND,
        message: `Vai trò ${normalizedRoleCode} không tồn tại hoặc đã ngừng sử dụng.`,
      });
    }
    return role;
  }

  private async findEntityOrFail(id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException({
        code: ErrorCode.ROLE_NOT_FOUND,
        message: 'Không tìm thấy vai trò.',
      });
    }
    return role;
  }

  private async assertRoleCodeAvailable(roleCode: string): Promise<void> {
    const existingRole = await this.roleRepository.findOne({
      where: { roleCode },
      withDeleted: true,
    });
    if (existingRole) {
      throw new ConflictException({
        code: ErrorCode.ROLE_CODE_EXISTS,
        message: 'Mã vai trò đã tồn tại.',
      });
    }
  }

  private normalizeRoleCode(roleCode: string): string {
    return roleCode.trim().toUpperCase();
  }
}
