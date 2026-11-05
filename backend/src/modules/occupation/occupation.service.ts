import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { CreateOccupationDto } from './dto/create-occupation.dto.js';
import { OccupationQueryDto } from './dto/occupation-query.dto.js';
import { OccupationResponseDto } from './dto/occupation-response.dto.js';
import { UpdateOccupationDto } from './dto/update-occupation.dto.js';
import { OccupationEntity } from './occupation.entity.js';

@Injectable()
export class OccupationService {
  constructor(
    @InjectRepository(OccupationEntity)
    private readonly occupationRepository: Repository<OccupationEntity>,
  ) {}

  async getAll(
    query: OccupationQueryDto = {},
  ): Promise<OccupationResponseDto[]> {
    const where: FindOptionsWhere<OccupationEntity> = {};

    if (query.occupationCode?.trim()) {
      where.occupationCode = ILike(`%${query.occupationCode.trim()}%`);
    }
    if (query.occupationName?.trim()) {
      where.occupationName = ILike(`%${query.occupationName.trim()}%`);
    }
    if (query.level !== undefined) {
      where.level = query.level;
    }
    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else if (!query.includeInactive) {
      where.isActive = true;
    }

    const occupations = await this.occupationRepository.find({
      where,
      order: { occupationCode: 'ASC' },
    });
    return occupations.map((occupation) => this.toResponse(occupation));
  }

  async getSelectable(): Promise<OccupationResponseDto[]> {
    return this.getAll({ level: 4, isActive: true });
  }

  async getById(id: number): Promise<OccupationResponseDto> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(
    dto: CreateOccupationDto,
    creatorId?: number,
  ): Promise<OccupationResponseDto> {
    const occupationCode = dto.occupationCode.trim();
    const occupationName = this.normalizeName(dto.occupationName);
    const parentId = dto.parentId ?? null;

    await this.assertCodeAvailable(occupationCode);
    const level = await this.deriveAndValidateHierarchy(
      occupationCode,
      parentId,
    );
    await this.assertNameAvailable(occupationName, parentId);

    const entity = this.occupationRepository.create({
      occupationCode,
      occupationName,
      level,
      parentId,
      isActive: true,
      createdBy: creatorId ?? null,
      updatedBy: creatorId ?? null,
    });
    return this.toResponse(await this.occupationRepository.save(entity));
  }

  async update(
    id: number,
    dto: UpdateOccupationDto,
    updaterId?: number,
  ): Promise<OccupationResponseDto> {
    const current = await this.findEntityOrFail(id);
    const occupationName = this.normalizeName(dto.occupationName);

    if (
      occupationName.toLocaleLowerCase() !==
      current.occupationName.toLocaleLowerCase()
    ) {
      await this.assertNameAvailable(occupationName, current.parentId, id);
    }

    await this.occupationRepository.update(id, {
      occupationName,
      updatedBy: updaterId ?? null,
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async updateStatus(
    id: number,
    isActive: boolean,
    updaterId?: number,
  ): Promise<OccupationResponseDto> {
    const current = await this.findEntityOrFail(id);
    if (current.isActive === isActive) {
      return this.toResponse(current);
    }

    if (isActive) {
      await this.validateStoredHierarchy(current);
    } else {
      const hasActiveChildren = await this.occupationRepository.exists({
        where: { parentId: id, isActive: true },
      });
      if (hasActiveChildren) {
        throw new ConflictException({
          code: ErrorCode.OCCUPATION_HAS_CHILDREN,
          message:
            'Không thể ngừng sử dụng nghề nghiệp đang có nhóm con hoạt động.',
        });
      }
    }

    await this.occupationRepository.update(id, {
      isActive,
      updatedBy: updaterId ?? null,
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async remove(id: number): Promise<void> {
    const current = await this.findEntityOrFail(id);
    if (current.isActive) {
      throw new BadRequestException({
        code: ErrorCode.OCCUPATION_MUST_BE_INACTIVE,
        message: 'Phải ngừng sử dụng nghề nghiệp trước khi xóa.',
      });
    }

    const hasChildren = await this.occupationRepository.exists({
      where: { parentId: id },
    });
    if (hasChildren) {
      throw new ConflictException({
        code: ErrorCode.OCCUPATION_HAS_CHILDREN,
        message: 'Không thể xóa nghề nghiệp đang có nhóm con.',
      });
    }

    await this.occupationRepository.softDelete(id);
  }

  private async findEntityOrFail(id: number): Promise<OccupationEntity> {
    const occupation = await this.occupationRepository.findOne({
      where: { id },
    });
    if (!occupation) {
      throw new NotFoundException({
        code: ErrorCode.OCCUPATION_NOT_FOUND,
        message: 'Không tìm thấy nghề nghiệp.',
      });
    }
    return occupation;
  }

  private async assertCodeAvailable(occupationCode: string): Promise<void> {
    const existing = await this.occupationRepository.findOne({
      where: { occupationCode },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.OCCUPATION_CODE_EXISTS,
        message: 'Mã nghề đã tồn tại.',
      });
    }
  }

  private async assertNameAvailable(
    occupationName: string,
    parentId: number | null,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.occupationRepository.findOne({
      where: {
        occupationName: ILike(occupationName),
        parentId: parentId === null ? IsNull() : parentId,
      },
      withDeleted: true,
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        code: ErrorCode.OCCUPATION_NAME_EXISTS,
        message: 'Tên nghề nghiệp đã tồn tại trong cùng nhóm cha.',
      });
    }
  }

  private async deriveAndValidateHierarchy(
    occupationCode: string,
    parentId: number | null,
  ): Promise<number> {
    if (parentId === null) {
      if (occupationCode.length !== 1) {
        this.throwInvalidHierarchy(
          'Nghề nghiệp cấp 1 phải có mã gồm đúng 1 chữ số.',
        );
      }
      return 1;
    }

    const parent = await this.occupationRepository.findOne({
      where: { id: parentId, isActive: true },
    });
    if (!parent) {
      this.throwInvalidHierarchy(
        'Nhóm cha phải tồn tại, đang hoạt động và chưa bị xóa.',
      );
    }
    if (parent.level >= 4) {
      this.throwInvalidHierarchy('Nghề nghiệp cấp 4 không thể có nhóm con.');
    }

    await this.validateStoredHierarchy(parent);
    const level = parent.level + 1;
    this.validateCodeForParent(occupationCode, parent, level);
    return level;
  }

  private async validateStoredHierarchy(
    occupation: OccupationEntity,
  ): Promise<void> {
    let current = occupation;
    const visitedIds = new Set<number>();

    while (true) {
      if (visitedIds.has(current.id)) {
        this.throwInvalidHierarchy('Cây nghề nghiệp đang chứa chu trình.');
      }
      visitedIds.add(current.id);

      if (current.level === 1) {
        if (current.parentId !== null || current.occupationCode.length !== 1) {
          this.throwInvalidHierarchy(
            'Nghề nghiệp cấp 1 phải có mã 1 chữ số và không có nhóm cha.',
          );
        }
        return;
      }

      if (current.parentId === null) {
        this.throwInvalidHierarchy(
          `Nghề nghiệp cấp ${current.level} phải có nhóm cha.`,
        );
      }

      const parent = await this.occupationRepository.findOne({
        where: { id: current.parentId, isActive: true },
      });
      if (!parent || parent.level !== current.level - 1) {
        this.throwInvalidHierarchy(
          `Nhóm cha phải đang hoạt động và thuộc cấp ${current.level - 1}.`,
        );
      }
      this.validateCodeForParent(current.occupationCode, parent, current.level);
      current = parent;
    }
  }

  private validateCodeForParent(
    code: string,
    parent: OccupationEntity,
    level: number,
  ): void {
    if (code.length !== level || !code.startsWith(parent.occupationCode)) {
      this.throwInvalidHierarchy(
        `Mã cấp ${level} phải gồm ${level} chữ số và bắt đầu bằng mã cha ${parent.occupationCode}.`,
      );
    }
  }

  private throwInvalidHierarchy(message: string): never {
    throw new BadRequestException({
      code: ErrorCode.INVALID_OCCUPATION_HIERARCHY,
      message,
    });
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toResponse(entity: OccupationEntity): OccupationResponseDto {
    const {
      id,
      occupationCode,
      occupationName,
      level,
      parentId,
      isActive,
      createdAt,
      updatedAt,
    } = entity;
    return {
      id,
      occupationCode,
      occupationName,
      level,
      parentId,
      isActive,
      createdAt,
      updatedAt,
    };
  }
}
