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

interface IndustryHierarchy {
  level: number;
  rootPrefix: string | null;
}

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
    const parentId = dto.parentId ?? null;
    const hierarchy = await this.deriveHierarchyFromParent(parentId);
    const industryCode = this.normalizeIndustryCodeForHierarchy(
      dto.industryCode,
      hierarchy,
    );
    await this.assertIndustryCodeAvailable(industryCode);

    const industry = this.industryRepository.create({
      industryCode,
      industryName: dto.industryName.trim(),
      level: hierarchy.level,
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
    const nextParentId = hasParentId
      ? (dto.parentId ?? null)
      : industry.parentId;
    const nextHierarchy = hasParentId
      ? await this.deriveHierarchyFromParent(nextParentId, id)
      : { level: industry.level, rootPrefix: null };
    const nextLevel = nextHierarchy.level;
    const hierarchyChanged =
      nextParentId !== industry.parentId || nextLevel !== industry.level;

    if (hierarchyChanged) {
      this.assertIndustryCodeMatchesHierarchy(
        industry.industryCode,
        nextHierarchy,
      );
      const [hasChildren, isUsed] = await Promise.all([
        this.industryRepository.exists({ where: { parentId: id } }),
        this.enterpriseRepository.exists({ where: { industryId: id } }),
      ]);
      if (hasChildren) {
        throw new ConflictException({
          code: ErrorCode.INDUSTRY_HAS_CHILDREN,
          message:
            'Không thể thay đổi nhóm cha của ngành nghề đang có ngành con.',
        });
      }
      if (isUsed) {
        throw new ConflictException({
          code: ErrorCode.INDUSTRY_IN_USE,
          message:
            'Không thể thay đổi nhóm cha của ngành nghề đang được doanh nghiệp sử dụng.',
        });
      }
    }

    const updateData: Partial<IndustryEntity> = {};
    if (dto.industryName !== undefined) {
      updateData.industryName = dto.industryName.trim();
    }
    if (nextLevel !== industry.level) {
      updateData.level = nextLevel;
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
    const industry = await this.findEntityOrFail(id);
    if (industry.isActive === isActive) {
      return this.toResponse(industry);
    }

    if (isActive) {
      await this.validateStoredHierarchy(
        industry.industryCode,
        industry.level,
        industry.parentId,
        id,
      );
    } else {
      const [isUsed, hasActiveChildren] = await Promise.all([
        this.enterpriseRepository.exists({
          where: { industryId: id },
        }),
        this.industryRepository.exists({
          where: { parentId: id, isActive: true },
        }),
      ]);
      if (isUsed) {
        throw new ConflictException({
          code: ErrorCode.INDUSTRY_IN_USE,
          message:
            'Không thể ngừng sử dụng ngành nghề đang được doanh nghiệp sử dụng.',
        });
      }
      if (hasActiveChildren) {
        throw new ConflictException({
          code: ErrorCode.INDUSTRY_HAS_CHILDREN,
          message:
            'Không thể ngừng sử dụng ngành nghề đang có ngành con hoạt động.',
        });
      }
    }

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

    await this.industryRepository.softDelete(id);
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
      withDeleted: true,
    });
    if (industry) {
      throw new ConflictException({
        code: ErrorCode.INDUSTRY_CODE_EXISTS,
        message: 'Mã ngành nghề đã tồn tại.',
      });
    }
  }

  private async deriveHierarchyFromParent(
    parentId: number | null,
    currentId?: number,
  ): Promise<IndustryHierarchy> {
    if (parentId === null) {
      return { level: 1, rootPrefix: null };
    }

    if (parentId === currentId) {
      this.throwInvalidParent(
        'Ngành nghề không được chọn chính nó làm nhóm cha.',
      );
    }

    const parent = await this.industryRepository.findOne({
      where: { id: parentId, isActive: true },
    });
    if (!parent) {
      this.throwInvalidParent(
        'Nhóm cha phải tồn tại, đang hoạt động và chưa bị xóa.',
      );
    }
    if (parent.level >= 4) {
      this.throwInvalidParent('Ngành cấp 4 không thể có ngành con.');
    }

    const root = await this.validateAncestorChain(parent, currentId);
    return {
      level: parent.level + 1,
      rootPrefix: this.getRootPrefix(root),
    };
  }

  private async validateStoredHierarchy(
    industryCode: string,
    level: number,
    parentId: number | null,
    currentId: number,
  ): Promise<void> {
    const hierarchy = await this.deriveHierarchyFromParent(parentId, currentId);
    if (level !== hierarchy.level) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_INDUSTRY_LEVEL,
        message: `Cấp ngành phải là ${hierarchy.level} theo nhóm cha đã chọn.`,
      });
    }
    this.assertIndustryCodeMatchesHierarchy(industryCode, hierarchy);
  }

  private async validateAncestorChain(
    industry: IndustryEntity,
    currentId?: number,
  ): Promise<IndustryEntity> {
    let current = industry;
    const visitedIds = new Set<number>();
    if (currentId !== undefined) {
      visitedIds.add(currentId);
    }

    while (true) {
      if (visitedIds.has(current.id)) {
        this.throwInvalidParent(
          'Nhóm cha không được là chính ngành nghề hoặc con cháu của nó.',
        );
      }
      visitedIds.add(current.id);

      if (current.level === 1) {
        if (current.parentId !== null) {
          this.throwInvalidParent('Ngành cấp 1 không được có nhóm cha.');
        }
        return current;
      }

      if (current.parentId === null) {
        this.throwInvalidParent(
          `Ngành cấp ${current.level} phải có nhóm cha hợp lệ.`,
        );
      }

      const parent = await this.industryRepository.findOne({
        where: { id: current.parentId, isActive: true },
      });
      if (!parent || parent.level !== current.level - 1) {
        this.throwInvalidParent(
          `Nhóm cha phải đang hoạt động và thuộc cấp ${current.level - 1}.`,
        );
      }
      current = parent;
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

  private normalizeIndustryCodeForHierarchy(
    industryCode: string,
    hierarchy: IndustryHierarchy,
  ): string {
    const normalizedCode = this.normalizeIndustryCode(industryCode);
    if (hierarchy.level === 1) {
      if (!/^[A-Z]/.test(normalizedCode)) {
        this.throwInvalidCodePrefix(
          'Mã ngành cấp 1 phải bắt đầu bằng một chữ cái.',
        );
      }
      return normalizedCode;
    }

    const rootPrefix = hierarchy.rootPrefix;
    if (!rootPrefix) {
      this.throwInvalidCodePrefix(
        'Không xác định được tiền tố từ ngành cấp 1.',
      );
    }

    const firstCharacter = normalizedCode.charAt(0);
    if (/^[A-Z]$/.test(firstCharacter) && firstCharacter !== rootPrefix) {
      this.throwInvalidCodePrefix(
        `Mã ngành cấp ${hierarchy.level} phải bắt đầu bằng tiền tố ${rootPrefix} của ngành cấp 1.`,
      );
    }

    const storedCode = normalizedCode.startsWith(rootPrefix)
      ? normalizedCode
      : `${rootPrefix}${normalizedCode}`;
    if (storedCode.length > 50) {
      this.throwInvalidCodePrefix(
        'Mã ngành sau khi thêm tiền tố không được vượt quá 50 ký tự.',
      );
    }
    return storedCode;
  }

  private assertIndustryCodeMatchesHierarchy(
    industryCode: string,
    hierarchy: IndustryHierarchy,
  ): void {
    const normalizedCode = this.normalizeIndustryCode(industryCode);
    if (hierarchy.level === 1) {
      if (!/^[A-Z]/.test(normalizedCode)) {
        this.throwInvalidCodePrefix(
          'Mã ngành cấp 1 phải bắt đầu bằng một chữ cái.',
        );
      }
      return;
    }

    if (
      !hierarchy.rootPrefix ||
      !normalizedCode.startsWith(hierarchy.rootPrefix)
    ) {
      this.throwInvalidCodePrefix(
        `Không thể chuyển ngành sang nhánh có tiền tố ${hierarchy.rootPrefix ?? 'không hợp lệ'} mà không đổi mã ngành.`,
      );
    }
  }

  private getRootPrefix(root: IndustryEntity): string {
    const rootPrefix = this.normalizeIndustryCode(root.industryCode).charAt(0);
    if (!/^[A-Z]$/.test(rootPrefix)) {
      this.throwInvalidCodePrefix(
        'Mã ngành cấp 1 phải bắt đầu bằng một chữ cái.',
      );
    }
    return rootPrefix;
  }

  private throwInvalidCodePrefix(message: string): never {
    throw new BadRequestException({
      code: ErrorCode.INVALID_INDUSTRY_CODE_PREFIX,
      message,
    });
  }

  private toResponse(industry: IndustryEntity): IndustryResponseDto {
    const { id, industryCode, industryName, level, parentId, isActive } =
      industry;
    return { id, industryCode, industryName, level, parentId, isActive };
  }
}
