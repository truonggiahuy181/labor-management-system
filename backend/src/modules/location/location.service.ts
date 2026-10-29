import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import {
  ProvinceResponseDto,
  WardResponseDto,
} from './dto/location-response.dto.js';
import { ProvinceEntity } from './province.entity.js';
import { WardEntity } from './ward.entity.js';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(ProvinceEntity)
    private readonly provinceRepository: Repository<ProvinceEntity>,
    @InjectRepository(WardEntity)
    private readonly wardRepository: Repository<WardEntity>,
  ) {}

  async getProvinces(): Promise<ProvinceResponseDto[]> {
    const provinces = await this.provinceRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });

    return provinces.map(({ code, name, divisionType }) => ({
      code,
      name,
      divisionType,
    }));
  }

  async getWards(provinceCode: string): Promise<WardResponseDto[]> {
    const provinceExists = await this.provinceRepository.exists({
      where: { code: provinceCode, isActive: true },
    });
    if (!provinceExists) {
      throw new NotFoundException({
        code: ErrorCode.PROVINCE_NOT_FOUND,
        message: 'Không tìm thấy tỉnh/thành phố.',
      });
    }

    const wards = await this.wardRepository.find({
      where: { provinceCode, isActive: true },
      order: { name: 'ASC' },
    });

    return wards.map(({ code, name, divisionType }) => ({
      code,
      provinceCode,
      name,
      divisionType,
    }));
  }

  async assertValidSelection(
    provinceCode: string | null | undefined,
    wardCode: string | null | undefined,
  ): Promise<void> {
    if (!provinceCode && !wardCode) {
      return;
    }
    if (!provinceCode) {
      this.throwInvalidSelection('Phải chọn tỉnh/thành phố trước phường/xã.');
    }

    const provinceExists = await this.provinceRepository.exists({
      where: { code: provinceCode, isActive: true },
    });
    if (!provinceExists) {
      this.throwInvalidSelection('Mã tỉnh/thành phố không hợp lệ.');
    }

    if (!wardCode) {
      return;
    }

    const wardExists = await this.wardRepository.exists({
      where: {
        code: wardCode,
        provinceCode,
        isActive: true,
      },
    });
    if (!wardExists) {
      this.throwInvalidSelection(
        'Mã phường/xã không tồn tại hoặc không thuộc tỉnh/thành phố đã chọn.',
      );
    }
  }

  private throwInvalidSelection(message: string): never {
    throw new BadRequestException({
      code: ErrorCode.INVALID_LOCATION_SELECTION,
      message,
    });
  }
}
