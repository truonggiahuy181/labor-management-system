import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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

const LEVEL_FOUR_INDUSTRY_CODE_RE = /^\d{4}$/;

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
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
    this.assertLevelFourIndustry(dto.mainIndustry);
    await this.assertTaxCodeAvailable(dto.taxCode);
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await argon2.hash('1-8');
    const roleId = Number(this.configService.get('ENTERPRISE_ROLE_ID', 2));

    const enterprise = await this.dataSource.transaction(async (manager) => {
      const newEnterprise = await manager.save(
        manager.create(EnterpriseEntity, {
          ...dto,
          email: dto.email.trim().toLowerCase(),
          foreignName: dto.foreignName ?? null,
          officePhone: dto.officePhone ?? null,
          leaderName: dto.leaderName ?? null,
          leaderPhone: dto.leaderPhone ?? null,
          operatingProvince: dto.operatingProvince ?? null,
          operatingWard: dto.operatingWard ?? null,
          businessLocation: dto.businessLocation ?? null,
          businessLicensePath: dto.businessLicensePath ?? null,
          otherDocumentPath: dto.otherDocumentPath ?? null,
          isActive: true,
          createdBy: creatorId ?? null,
          updatedBy: creatorId ?? null,
        }),
      );

      await manager.save(
        manager.create(UserEntity, {
          username: dto.taxCode,
          passwordHash,
          fullName: dto.leaderName || dto.companyName,
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.leaderPhone ?? null,
          roleId,
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
    if (dto.mainIndustry !== undefined) {
      this.assertLevelFourIndustry(dto.mainIndustry);
    }
    if (dto.taxCode && dto.taxCode !== enterprise.taxCode) {
      await this.assertTaxCodeAvailable(dto.taxCode);
    }

    const updateData: Partial<EnterpriseEntity> = {
      ...dto,
      email: dto.email?.trim().toLowerCase(),
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

  async remove(id: number): Promise<void> {
    await this.findEntityOrFail(id);
    await this.enterpriseRepository.softDelete(id);
  }

  private async findEntityOrFail(id: number): Promise<EnterpriseEntity> {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id } });
    if (!enterprise) {
      throw new NotFoundException('Không tìm thấy doanh nghiệp');
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

  private assertLevelFourIndustry(mainIndustry: string): void {
    if (!LEVEL_FOUR_INDUSTRY_CODE_RE.test(mainIndustry)) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_MAIN_INDUSTRY,
        message: 'Chỉ được chọn ngành nghề kinh doanh cấp 4.',
      });
    }
  }
}
