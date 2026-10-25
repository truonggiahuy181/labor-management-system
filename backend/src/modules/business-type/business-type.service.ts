import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { BusinessTypeEntity } from './business-type.entity.js';
import { BusinessTypeResponseDto } from './dto/business-type-response.dto.js';
import {
  CreateBusinessTypeDto,
  UpdateBusinessTypeDto,
} from './dto/business-type.dto.js';

@Injectable()
export class BusinessTypeService {
  constructor(
    @InjectRepository(BusinessTypeEntity)
    private readonly businessTypeRepository: Repository<BusinessTypeEntity>,
  ) {}

  async getAll(includeInactive = false): Promise<BusinessTypeResponseDto[]> {
    const businessTypes = await this.businessTypeRepository.find({
      where: includeInactive ? {} : { isActive: true },
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
    return this.getAll(false);
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
