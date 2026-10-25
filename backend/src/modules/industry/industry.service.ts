import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { IndustryResponseDto } from './dto/industry-response.dto.js';
import { IndustryEntity } from './industry.entity.js';

@Injectable()
export class IndustryService {
  constructor(
    @InjectRepository(IndustryEntity)
    private readonly industryRepository: Repository<IndustryEntity>,
  ) {}

  async getAllLevelFour(): Promise<IndustryResponseDto[]> {
    const industries = await this.industryRepository.find({
      where: { level: 4 },
      order: { industryCode: 'ASC' },
    });

    return industries.map(
      ({ id, industryCode, industryName, level, parentId }) => ({
        id,
        industryCode,
        industryName,
        level,
        parentId,
      }),
    );
  }

  async getLevelFourByIdOrFail(id: number): Promise<IndustryEntity> {
    const industry = await this.industryRepository.findOne({ where: { id } });

    if (!industry || industry.level !== 4) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_MAIN_INDUSTRY,
        message: 'Ngành nghề kinh doanh chính phải là ngành cấp 4 hợp lệ.',
      });
    }

    return industry;
  }
}
