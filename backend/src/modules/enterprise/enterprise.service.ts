import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { UserEntity } from '../user/user.entity.js';
import { UserService } from '../user/user.service.js';
import {
  CreateEnterpriseDto,
  UpdateEnterpriseDto,
} from './dto/enterprise.dto.js';
import { EnterpriseEntity } from './enterprise.entity.js';
import { EnterpriseMapper, EnterpriseResponse } from './enterprise.mapper.js';
import { BusinessTypeService } from '../business-type/business-type.service.js';
import { IndustryService } from '../industry/industry.service.js';
import { RoleService } from '../role/role.service.js';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
    private readonly businessTypeService: BusinessTypeService,
    private readonly industryService: IndustryService,
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  async getAll(): Promise<EnterpriseResponse[]> {
    const enterprises = await this.enterpriseRepository.find({
      order: { id: 'DESC' },
    });
    return EnterpriseMapper.toResponseList(enterprises);
  }

  async getById(id: number): Promise<EnterpriseResponse> {
    return EnterpriseMapper.toResponse(await this.findEntityOrFail(id));
  }

  async create(
    dto: CreateEnterpriseDto,
    creatorId?: number,
  ): Promise<EnterpriseResponse> {
    await this.businessTypeService.getActiveByIdOrFail(dto.businessTypeId);
    await this.industryService.getLevelFourByIdOrFail(dto.industryId);
    await this.assertTaxCodeAvailable(dto.taxCode);
    await this.assertEmailAvailable(dto.email);

    const enterpriseRole =
      await this.roleService.getByCodeOrFail('ENTERPRISE_USER');

    const passwordHash = await argon2.hash('1-8');

    const enterprise = await this.dataSource.transaction(async (manager) => {
      const newEnterprise = await manager.save(
        manager.create(EnterpriseEntity, {
          ...dto,
          email: dto.email.trim().toLowerCase(),
          foreignName: dto.foreignName ?? null,
          phoneNumber: dto.phoneNumber ?? null,
          representativeName: dto.representativeName ?? null,
          representativePhone: dto.representativePhone ?? null,
          operatingProvinceId: dto.operatingProvinceId ?? null,
          operatingWardId: dto.operatingWardId ?? null,
          operatingAddress: dto.operatingAddress ?? null,
          isActive: true,
          createdBy: creatorId ?? null,
          updatedBy: creatorId ?? null,
        }),
      );

      await manager.save(
        manager.create(UserEntity, {
          username: dto.taxCode,
          passwordHash,
          fullName: dto.representativeName || dto.enterpriseName,
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.representativePhone ?? null,
          roleId: enterpriseRole.id,
          enterpriseId: newEnterprise.id,
          isActive: true,
          createdBy: creatorId ?? null,
          updatedBy: creatorId ?? null,
        }),
      );

      return newEnterprise;
    });
    return EnterpriseMapper.toResponse(enterprise);
  }

  async update(
    id: number,
    dto: UpdateEnterpriseDto,
    updaterId?: number,
  ): Promise<EnterpriseResponse> {
    const enterprise = await this.findEntityOrFail(id);
    if (dto.businessTypeId !== undefined) {
      await this.businessTypeService.getActiveByIdOrFail(dto.businessTypeId);
    }
    if (dto.industryId !== undefined) {
      await this.industryService.getLevelFourByIdOrFail(dto.industryId);
    }
    if (dto.taxCode && dto.taxCode !== enterprise.taxCode) {
      await this.assertTaxCodeAvailable(dto.taxCode);
    }

    const normalizedEmail = dto.email?.trim().toLowerCase();
    if (normalizedEmail && normalizedEmail !== enterprise.email) {
      await this.assertEmailAvailable(normalizedEmail);
    }

    const updateData: Partial<EnterpriseEntity> = {
      ...dto,
      email: normalizedEmail,
      updatedBy: updaterId ?? null,
    };
    Object.keys(updateData).forEach((key) => {
      if ((updateData as Record<string, unknown>)[key] === undefined) {
        delete (updateData as Record<string, unknown>)[key];
      }
    });

    await this.enterpriseRepository.update(id, updateData);
    return EnterpriseMapper.toResponse(await this.findEntityOrFail(id));
  }

  async updateStatus(
    id: number,
    isActive: boolean,
    updaterId?: number,
  ): Promise<EnterpriseResponse> {
    await this.findEntityOrFail(id);
    await this.enterpriseRepository.update(id, {
      isActive,
      updatedBy: updaterId ?? null,
    });
    return EnterpriseMapper.toResponse(await this.findEntityOrFail(id));
  }

  private async findEntityOrFail(id: number): Promise<EnterpriseEntity> {
    const enterprise = await this.enterpriseRepository.findOne({
      where: { id },
    });
    if (!enterprise) {
      throw new NotFoundException({
        code: ErrorCode.ENTERPRISE_NOT_FOUND,
        message: 'Không tìm thấy doanh nghiệp.',
      });
    }
    return enterprise;
  }

  private async assertTaxCodeAvailable(taxCode: string): Promise<void> {
    const [enterprise, user] = await Promise.all([
      this.enterpriseRepository.findOne({ where: { taxCode } }),
      this.userService.findByUsername(taxCode),
    ]);
    if (enterprise || user) {
      throw new ConflictException({
        code: ErrorCode.TAX_CODE_EXISTS,
        message: 'Mã số thuế đã tồn tại trong hệ thống.',
      });
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalizedEmail);
    if (user) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_EXISTS,
        message: 'Email đã được sử dụng.',
      });
    }
  }
}
