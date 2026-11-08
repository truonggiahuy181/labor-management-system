import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { AccidentCauseEntity } from './accident-cause.entity.js';
import { AccidentCauseQueryDto } from './dto/accident-cause-query.dto.js';
import { AccidentCauseResponseDto } from './dto/accident-cause-response.dto.js';

@Injectable()
export class AccidentCauseService {
  constructor(
    @InjectRepository(AccidentCauseEntity)
    private readonly repository: Repository<AccidentCauseEntity>,
  ) {}

  async getAll(
    query: AccidentCauseQueryDto = {},
  ): Promise<AccidentCauseResponseDto[]> {
    const where: FindOptionsWhere<AccidentCauseEntity> = {};
    if (query.causeGroup !== undefined) where.causeGroup = query.causeGroup;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    else if (!query.includeInactive) where.isActive = true;

    const rows = await this.repository.find({
      where,
      order: { displayOrder: 'ASC', causeCode: 'ASC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async getById(id: number): Promise<AccidentCauseResponseDto> {
    const row = await this.repository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.ACCIDENT_CAUSE_NOT_FOUND,
        message: 'Không tìm thấy nguyên nhân tai nạn lao động.',
      });
    }
    return this.toResponse(row);
  }

  private toResponse(row: AccidentCauseEntity): AccidentCauseResponseDto {
    const { id, causeCode, causeName, causeGroup, displayOrder, isActive } =
      row;
    return {
      id,
      causeCode,
      causeName,
      causeGroup,
      displayOrder,
      isActive,
    };
  }
}
