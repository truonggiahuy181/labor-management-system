import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { OccupationalAccidentCaseEntity } from '../occupational-accident-report/entities/occupational-accident-case.entity.js';
import { CreateInjuryFactorDto } from './dto/create-injury-factor.dto.js';
import { InjuryFactorQueryDto } from './dto/injury-factor-query.dto.js';
import { InjuryFactorResponseDto } from './dto/injury-factor-response.dto.js';
import { UpdateInjuryFactorDto } from './dto/update-injury-factor.dto.js';
import { InjuryFactorEntity } from './injury-factor.entity.js';

@Injectable()
export class InjuryFactorService {
  constructor(
    @InjectRepository(InjuryFactorEntity)
    private readonly injuryFactorRepository: Repository<InjuryFactorEntity>,
    @InjectRepository(OccupationalAccidentCaseEntity)
    private readonly accidentCaseRepository: Repository<OccupationalAccidentCaseEntity>,
  ) {}

  async getAll(
    query: InjuryFactorQueryDto = {},
  ): Promise<InjuryFactorResponseDto[]> {
    const where: FindOptionsWhere<InjuryFactorEntity> = {};

    if (query.factorCode?.trim()) {
      where.factorCode = ILike(`%${query.factorCode.trim()}%`);
    }
    if (query.factorName?.trim()) {
      where.factorName = ILike(`%${query.factorName.trim()}%`);
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else if (!query.includeInactive) {
      where.isActive = true;
    }

    const injuryFactors = await this.injuryFactorRepository.find({
      where,
      order: { factorCode: 'ASC' },
    });
    return injuryFactors.map((injuryFactor) => this.toResponse(injuryFactor));
  }

  async getById(id: number): Promise<InjuryFactorResponseDto> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(
    dto: CreateInjuryFactorDto,
    creatorId?: number,
  ): Promise<InjuryFactorResponseDto> {
    const factorCode = this.normalizeText(dto.factorCode);
    const factorName = this.normalizeText(dto.factorName);
    await this.assertFactorCodeAvailable(factorCode);

    const entity = this.injuryFactorRepository.create({
      factorCode,
      factorName,
      isActive: dto.isActive ?? true,
      createdBy: creatorId ?? null,
      updatedBy: creatorId ?? null,
    });
    return this.toResponse(await this.injuryFactorRepository.save(entity));
  }

  async update(
    id: number,
    dto: UpdateInjuryFactorDto,
    updaterId?: number,
  ): Promise<InjuryFactorResponseDto> {
    const current = await this.findEntityOrFail(id);
    const updateData: Partial<InjuryFactorEntity> = {
      updatedBy: updaterId ?? null,
    };

    if (dto.factorCode !== undefined) {
      const factorCode = this.normalizeText(dto.factorCode);
      if (factorCode !== current.factorCode) {
        await this.assertNotInUse(id);
        await this.assertFactorCodeAvailable(factorCode, id);
        updateData.factorCode = factorCode;
      }
    }
    if (dto.factorName !== undefined) {
      updateData.factorName = this.normalizeText(dto.factorName);
    }
    if (dto.isActive !== undefined) {
      if (current.isActive && !dto.isActive) {
        await this.assertNotInUse(id);
      }
      updateData.isActive = dto.isActive;
    }

    await this.injuryFactorRepository.update(id, updateData);
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async updateStatus(
    id: number,
    isActive: boolean,
    updaterId?: number,
  ): Promise<InjuryFactorResponseDto> {
    const current = await this.findEntityOrFail(id);
    if (current.isActive === isActive) {
      return this.toResponse(current);
    }
    if (!isActive) {
      await this.assertNotInUse(id);
    }
    await this.injuryFactorRepository.update(id, {
      isActive,
      updatedBy: updaterId ?? null,
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async remove(id: number): Promise<void> {
    const injuryFactor = await this.findEntityOrFail(id);
    if (injuryFactor.isActive) {
      throw new BadRequestException({
        code: ErrorCode.INJURY_FACTOR_MUST_BE_INACTIVE,
        message: 'Phải ngừng sử dụng yếu tố gây chấn thương trước khi xóa.',
      });
    }
    await this.assertNotInUse(id);
    await this.injuryFactorRepository.softDelete(id);
  }

  private async findEntityOrFail(id: number): Promise<InjuryFactorEntity> {
    const injuryFactor = await this.injuryFactorRepository.findOne({
      where: { id },
    });
    if (!injuryFactor) {
      throw new NotFoundException({
        code: ErrorCode.INJURY_FACTOR_NOT_FOUND,
        message: 'Không tìm thấy yếu tố gây chấn thương.',
      });
    }
    return injuryFactor;
  }

  private async assertFactorCodeAvailable(
    factorCode: string,
    excludeId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<InjuryFactorEntity> = {
      factorCode: ILike(factorCode),
    };
    if (excludeId !== undefined) {
      where.id = Not(excludeId);
    }

    const existing = await this.injuryFactorRepository.findOne({
      where,
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.INJURY_FACTOR_CODE_EXISTS,
        message: 'Mã yếu tố gây chấn thương đã tồn tại.',
      });
    }
  }

  private async assertNotInUse(id: number): Promise<void> {
    const inUse = await this.accidentCaseRepository.exists({
      where: { injuryFactorId: id },
    });
    if (inUse) {
      throw new ConflictException({
        code: ErrorCode.INJURY_FACTOR_IN_USE,
        message:
          'Không thể ngừng sử dụng hoặc xóa yếu tố gây chấn thương đã được dùng trong báo cáo tai nạn lao động.',
      });
    }
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toResponse(entity: InjuryFactorEntity): InjuryFactorResponseDto {
    const { id, factorCode, factorName, isActive, createdAt, updatedAt } =
      entity;
    return {
      id,
      factorCode,
      factorName,
      isActive,
      createdAt,
      updatedAt,
    };
  }
}
