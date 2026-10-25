import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { RoleEntity } from './role.entity.js';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async getByIdOrFail(id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new BadRequestException({
        code: ErrorCode.ROLE_NOT_FOUND,
        message: 'Vai trò không tồn tại.',
      });
    }
    return role;
  }

  async getByCodeOrFail(roleCode: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { roleCode } });
    if (!role) {
      throw new BadRequestException({
        code: ErrorCode.ROLE_NOT_FOUND,
        message: `Vai trò ${roleCode} không tồn tại.`,
      });
    }
    return role;
  }
}
