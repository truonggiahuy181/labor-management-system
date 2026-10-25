import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { BusinessTypeEntity } from './business-type.entity.js';
import { BusinessTypeResponseDto } from './dto/business-type-response.dto.js';

@Injectable()
export class BusinessTypeService {
  constructor(
    @InjectRepository(BusinessTypeEntity)
    private readonly businessTypeRepository: Repository<BusinessTypeEntity>,
  ) {}

  async getAllActive(): Promise<BusinessTypeResponseDto[]> {
    const businessTypes = await this.businessTypeRepository.find({
      where: { isActive: true },
      order: { typeName: 'ASC' },
    });

    return businessTypes.map(({ id, typeCode, typeName }) => ({
      id,
      typeCode,
      typeName,
    }));
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
}
