import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';
import { BusinessTypeEntity } from './business-type.entity.js';
import { BusinessTypeResponseDto } from './dto/business-type-response.dto.js';
import { BusinessTypeQueryDto } from './dto/business-type-query.dto.js';
import { CreateBusinessTypeDto } from './dto/create-business-type.dto.js';
import { UpdateBusinessTypeDto } from './dto/update-business-type.dto.js';

@Injectable()
export class BusinessTypeService {
  constructor(
    @InjectRepository(BusinessTypeEntity)
    private readonly businessTypeRepository: Repository<BusinessTypeEntity>,
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
  ) {}

  async getAll(
    query: BusinessTypeQueryDto = {},
  ): Promise<BusinessTypeResponseDto[]> {
    const baseWhere: FindOptionsWhere<BusinessTypeEntity> = {};
    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    } else if (!query.includeInactive) {
      baseWhere.isActive = true;
    }

    const search = query.search?.trim();
    const where:
      | FindOptionsWhere<BusinessTypeEntity>
      | FindOptionsWhere<BusinessTypeEntity>[] = search
      ? [
          { ...baseWhere, typeCode: ILike(`%${search}%`) },
          { ...baseWhere, typeName: ILike(`%${search}%`) },
        ]
      : baseWhere;

    const businessTypes = await this.businessTypeRepository.find({
      where,
      order: { typeName: 'ASC' },
    });

    return businessTypes.map(({ id, typeCode, typeName, isActive }) => ({
      id,
      typeCode,
      typeName,
      isActive,
    }));
  }

  async getAllActive(): Promise<BusinessTypeResponseDto[]> {
    return this.getAll({ isActive: true });
  }

  async create(dto: CreateBusinessTypeDto): Promise<BusinessTypeResponseDto> {
    const typeCode = this.normalizeTypeCode(dto.typeCode);
    await this.assertTypeCodeAvailable(typeCode);

    return this.businessTypeRepository.save(
      this.businessTypeRepository.create({
        typeCode,
        typeName: dto.typeName.trim(),
        isActive: true,
      }),
    );
  }

  async update(
    id: number,
    dto: UpdateBusinessTypeDto,
  ): Promise<BusinessTypeResponseDto> {
    await this.findEntityOrFail(id);

    if (dto.typeName !== undefined) {
      await this.businessTypeRepository.update(id, {
        typeName: dto.typeName.trim(),
      });
    }

    return this.findEntityOrFail(id);
  }

  async updateStatus(
    id: number,
    isActive: boolean,
  ): Promise<BusinessTypeResponseDto> {
    await this.findEntityOrFail(id);
    await this.businessTypeRepository.update(id, { isActive });
    return this.findEntityOrFail(id);
  }

  async remove(id: number): Promise<void> {
    const businessType = await this.findEntityOrFail(id);
    if (businessType.isActive) {
      throw new BadRequestException({
        code: ErrorCode.BUSINESS_TYPE_MUST_BE_INACTIVE,
        message: 'Phải ngừng sử dụng loại hình kinh doanh trước khi xóa.',
      });
    }

    const isUsed = await this.enterpriseRepository.exists({
      where: { businessTypeId: id },
    });
    if (isUsed) {
      throw new ConflictException({
        code: ErrorCode.BUSINESS_TYPE_IN_USE,
        message:
          'Không thể xóa loại hình kinh doanh đang được doanh nghiệp sử dụng.',
      });
    }

    await this.businessTypeRepository.softDelete(id);
  }

  async getActiveByIdOrFail(id: number): Promise<BusinessTypeEntity> {
    const businessType = await this.businessTypeRepository.findOne({
      where: { id, isActive: true },
    });

    if (!businessType) {
      throw new BadRequestException({
        code: ErrorCode.BUSINESS_TYPE_NOT_FOUND,
        message: 'Loại hình kinh doanh không tồn tại hoặc đã ngừng sử dụng.',
      });
    }

    return businessType;
  }

  private async findEntityOrFail(id: number): Promise<BusinessTypeEntity> {
    const businessType = await this.businessTypeRepository.findOne({
      where: { id },
    });
    if (!businessType) {
      throw new NotFoundException({
        code: ErrorCode.BUSINESS_TYPE_NOT_FOUND,
        message: 'Không tìm thấy loại hình kinh doanh.',
      });
    }
    return businessType;
  }

  private async assertTypeCodeAvailable(typeCode: string): Promise<void> {
    const existingBusinessType = await this.businessTypeRepository.findOne({
      where: { typeCode },
      withDeleted: true,
    });
    if (existingBusinessType) {
      throw new ConflictException({
        code: ErrorCode.BUSINESS_TYPE_CODE_EXISTS,
        message: 'Mã loại hình kinh doanh đã tồn tại.',
      });
    }
  }

  private normalizeTypeCode(typeCode: string): string {
    return typeCode.trim().toUpperCase();
  }
}
