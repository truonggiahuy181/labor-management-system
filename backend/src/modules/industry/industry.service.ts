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
import { IndustryResponseDto } from './dto/industry-response.dto.js';
import { CreateIndustryDto } from './dto/create-industry.dto.js';
import { IndustryQueryDto } from './dto/industry-query.dto.js';
import { UpdateIndustryDto } from './dto/update-industry.dto.js';
import { IndustryEntity } from './industry.entity.js';

@Injectable()
export class IndustryService {
  constructor(
    @InjectRepository(IndustryEntity)
    private readonly industryRepository: Repository<IndustryEntity>,
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
  ) {}

  async getAll(query: IndustryQueryDto = {}): Promise<IndustryResponseDto[]> {
    const baseWhere: FindOptionsWhere<IndustryEntity> = {};

    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    } else if (!query.includeInactive) {
      baseWhere.isActive = true;
    }
    if (query.level !== undefined) {
      baseWhere.level = query.level;
    }
    if (query.parentId !== undefined) {
      baseWhere.parentId = query.parentId;
    }

    const search = query.search?.trim();
    const where:
      FindOptionsWhere<IndustryEntity> | FindOptionsWhere<IndustryEntity>[] =
      search
        ? [
            { ...baseWhere, industryCode: ILike(`%${search}%`) },
            { ...baseWhere, industryName: ILike(`%${search}%`) },
          ]
        : baseWhere;

    const industries = await this.industryRepository.find({
      where,
      order: { level: 'ASC', industryCode: 'ASC' },
    });

    return industries.map((industry) => this.toResponse(industry));
  }

  async getAllLevelFour(): Promise<IndustryResponseDto[]> {
    return this.getAll({ level: 4 });
  }

  async getById(id: number): Promise<IndustryResponseDto> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(dto: CreateIndustryDto): Promise<IndustryResponseDto> {
    const industryCode = this.normalizeIndustryCode(dto.industryCode);
    await this.assertIndustryCodeAvailable(industryCode);

    const parentId = dto.parentId ?? null;
    await this.validateParent(dto.level, parentId);

    const industry = this.industryRepository.create({
      industryCode,
      industryName: dto.industryName.trim(),
      level: dto.level,
      parentId,
      isActive: true,
    });

    return this.toResponse(await this.industryRepository.save(industry));
  }

  async update(
    id: number,
    dto: UpdateIndustryDto,
  ): Promise<IndustryResponseDto> {
    const industry = await this.findEntityOrFail(id);
    const hasParentId = Object.prototype.hasOwnProperty.call(dto, 'parentId');
    const nextLevel = dto.level ?? industry.level;
    const nextParentId = hasParentId
      ? (dto.parentId ?? null)
      : industry.parentId;

    if (dto.level !== undefined && dto.level !== industry.level) {
      const hasChildren = await this.industryRepository.exists({
        where: { parentId: id },
      });
      if (hasChildren) {
        throw new ConflictException({
          code: ErrorCode.INDUSTRY_HAS_CHILDREN,
          message: 'Không thể đổi cấp của ngành nghề đang có ngành con.',
        });
      }
    }

    if (dto.level !== undefined || hasParentId) {
      await this.validateParent(nextLevel, nextParentId, id);
    }

    const updateData: Partial<IndustryEntity> = {};
    if (dto.industryName !== undefined) {
      updateData.industryName = dto.industryName.trim();
    }
    if (dto.level !== undefined) {
      updateData.level = dto.level;
    }
    if (hasParentId) {
      updateData.parentId = nextParentId;
    }

    if (Object.keys(updateData).length > 0) {
      await this.industryRepository.update(id, updateData);
    }

    return this.toResponse(await this.findEntityOrFail(id));
  }

  async updateStatus(
    id: number,
    isActive: boolean,
  ): Promise<IndustryResponseDto> {
    await this.findEntityOrFail(id);
    await this.industryRepository.update(id, { isActive });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async remove(id: number): Promise<void> {
    const industry = await this.findEntityOrFail(id);
    if (industry.isActive) {
      throw new BadRequestException({
        code: ErrorCode.INDUSTRY_MUST_BE_INACTIVE,
        message: 'Phải ngừng sử dụng ngành nghề trước khi xóa.',
      });
    }

    const isUsed = await this.enterpriseRepository.exists({
      where: { industryId: id },
    });
    if (isUsed) {
      throw new ConflictException({
        code: ErrorCode.INDUSTRY_IN_USE,
        message: 'Không thể xóa ngành nghề đang được doanh nghiệp sử dụng.',
      });
    }

    const hasChildren = await this.industryRepository.exists({
      where: { parentId: id },
    });
    if (hasChildren) {
      throw new ConflictException({
        code: ErrorCode.INDUSTRY_HAS_CHILDREN,
        message: 'Không thể xóa ngành nghề đang có ngành con.',
      });
    }

    await this.industryRepository.delete(id);
  }

  async getLevelFourByIdOrFail(id: number): Promise<IndustryEntity> {
    const industry = await this.industryRepository.findOne({
      where: { id, isActive: true },
    });

    if (!industry || industry.level !== 4) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_MAIN_INDUSTRY,
        message:
          'Ngành nghề kinh doanh chính phải là ngành cấp 4 đang hoạt động.',
      });
    }

    return industry;
  }

  private async findEntityOrFail(id: number): Promise<IndustryEntity> {
    const industry = await this.industryRepository.findOne({ where: { id } });
    if (!industry) {
      throw new NotFoundException({
        code: ErrorCode.INDUSTRY_NOT_FOUND,
        message: 'Không tìm thấy ngành nghề.',
      });
    }
    return industry;
  }

  private async assertIndustryCodeAvailable(
    industryCode: string,
  ): Promise<void> {
    const industry = await this.industryRepository.findOne({
      where: { industryCode },
    });
    if (industry) {
      throw new ConflictException({
        code: ErrorCode.INDUSTRY_CODE_EXISTS,
        message: 'Mã ngành nghề đã tồn tại.',
      });
    }
  }

  private async validateParent(
    level: number,
    parentId: number | null,
    currentId?: number,
  ): Promise<void> {
    if (level === 1) {
      if (parentId !== null) {
        this.throwInvalidParent('Ngành cấp 1 không được có ngành cha.');
      }
      return;
    }

    if (parentId === null || parentId === currentId) {
      this.throwInvalidParent(`Ngành cấp ${level} phải có ngành cha hợp lệ.`);
    }

    const parent = await this.industryRepository.findOne({
      where: { id: parentId, isActive: true },
    });
    if (!parent || parent.level !== level - 1) {
      this.throwInvalidParent(
        `Ngành cha phải đang hoạt động và thuộc cấp ${level - 1}.`,
      );
    }
  }

  private throwInvalidParent(message: string): never {
    throw new BadRequestException({
      code: ErrorCode.INVALID_INDUSTRY_PARENT,
      message,
    });
  }

  private normalizeIndustryCode(industryCode: string): string {
    return industryCode.trim().toUpperCase();
  }

  private toResponse(industry: IndustryEntity): IndustryResponseDto {
    const { id, industryCode, industryName, level, parentId, isActive } =
      industry;
    return { id, industryCode, industryName, level, parentId, isActive };
  }
}
