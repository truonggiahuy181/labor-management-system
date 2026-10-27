import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { UserEntity } from '../user/user.entity.js';
import { UserService } from '../user/user.service.js';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto.js';
import { EnterpriseQueryDto } from './dto/enterprise-query.dto.js';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto.js';
import { EnterpriseEntity } from './enterprise.entity.js';
import { EnterpriseMapper, EnterpriseResponse } from './enterprise.mapper.js';
import { BusinessTypeService } from '../business-type/business-type.service.js';
import { IndustryService } from '../industry/industry.service.js';
import { RoleService } from '../role/role.service.js';
import { RoleCode } from '../../commons/constants/role-codes.js';

const INITIAL_ENTERPRISE_PASSWORD = '12345678';

export interface CreateEnterpriseResult {
  enterprise: EnterpriseResponse;
  initialAccess: {
    username: string;
    temporaryPassword: string;
  };
}

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly businessTypeService: BusinessTypeService,
    private readonly industryService: IndustryService,
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  async getAll(query: EnterpriseQueryDto = {}): Promise<EnterpriseResponse[]> {
    const baseWhere: FindOptionsWhere<EnterpriseEntity> = {};
    if (query.businessTypeId !== undefined) {
      baseWhere.businessTypeId = query.businessTypeId;
    }
    if (query.industryId !== undefined) {
      baseWhere.industryId = query.industryId;
    }
    if (query.provinceId !== undefined) {
      baseWhere.provinceId = query.provinceId.trim();
    }
    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    }

    const search = query.search?.trim();
    const where:
      | FindOptionsWhere<EnterpriseEntity>
      | FindOptionsWhere<EnterpriseEntity>[] = search
      ? [
          { ...baseWhere, enterpriseName: ILike(`%${search}%`) },
          { ...baseWhere, taxCode: ILike(`%${search}%`) },
          { ...baseWhere, email: ILike(`%${search}%`) },
          { ...baseWhere, representativeName: ILike(`%${search}%`) },
        ]
      : baseWhere;

    const enterprises = await this.enterpriseRepository.find({
      where,
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
  ): Promise<CreateEnterpriseResult> {
    await this.businessTypeService.getActiveByIdOrFail(dto.businessTypeId);
    await this.industryService.getLevelFourByIdOrFail(dto.industryId);
    await this.assertTaxCodeAvailable(dto.taxCode);
    await this.assertEmailAvailable(dto.email);

    const enterpriseRole = await this.roleService.getByCodeOrFail(
      RoleCode.ENTERPRISE_USER,
    );

    const passwordHash = await argon2.hash(INITIAL_ENTERPRISE_PASSWORD);

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
    return {
      enterprise: EnterpriseMapper.toResponse(enterprise),
      initialAccess: {
        username: dto.taxCode,
        temporaryPassword: INITIAL_ENTERPRISE_PASSWORD,
      },
    };
  }

  async update(
    id: number,
    dto: UpdateEnterpriseDto,
    updaterId?: number,
  ): Promise<EnterpriseResponse> {
    await this.findEntityOrFail(id);
    if (dto.businessTypeId !== undefined) {
      await this.businessTypeService.getActiveByIdOrFail(dto.businessTypeId);
    }
    if (dto.industryId !== undefined) {
      await this.industryService.getLevelFourByIdOrFail(dto.industryId);
    }

    const updateData = {
      ...dto,
      updatedBy: updaterId ?? null,
    } as Partial<EnterpriseEntity> & { taxCode?: string; email?: string };

    // Bảo vệ thêm ở tầng service nếu được gọi trực tiếp mà không qua ValidationPipe.
    delete updateData.taxCode;
    delete updateData.email;
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

  async remove(id: number): Promise<void> {
    const enterprise = await this.findEntityOrFail(id);
    if (enterprise.isActive) {
      throw new BadRequestException({
        code: ErrorCode.ENTERPRISE_MUST_BE_INACTIVE,
        message: 'Phải ngừng hoạt động doanh nghiệp trước khi xóa.',
      });
    }

    const isUsed = await this.userRepository.exists({
      where: { enterpriseId: id },
    });
    if (isUsed) {
      throw new ConflictException({
        code: ErrorCode.ENTERPRISE_IN_USE,
        message: 'Không thể xóa doanh nghiệp đang có người dùng trực thuộc.',
      });
    }

    await this.enterpriseRepository.softDelete(id);
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
      this.enterpriseRepository.findOne({
        where: { taxCode },
        withDeleted: true,
      }),
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
