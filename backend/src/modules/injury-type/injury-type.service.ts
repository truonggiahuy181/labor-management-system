import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { CreateInjuryTypeDto } from './dto/create-injury-type.dto.js';
import { InjuryTypeQueryDto } from './dto/injury-type-query.dto.js';
import { InjuryTypeResponseDto } from './dto/injury-type-response.dto.js';
import { UpdateInjuryTypeDto } from './dto/update-injury-type.dto.js';
import { InjuryTypeEntity } from './injury-type.entity.js';

@Injectable()
export class InjuryTypeService {
  constructor(
    @InjectRepository(InjuryTypeEntity)
    private readonly injuryTypeRepository: Repository<InjuryTypeEntity>,
  ) {}

  async getAll(
    query: InjuryTypeQueryDto = {},
  ): Promise<InjuryTypeResponseDto[]> {
    const where: FindOptionsWhere<InjuryTypeEntity> = {};

    if (query.injuryTypeCode?.trim()) {
      where.injuryTypeCode = ILike(`%${query.injuryTypeCode.trim()}%`);
    }
    if (query.injuryTypeName?.trim()) {
      where.injuryTypeName = ILike(`%${query.injuryTypeName.trim()}%`);
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

    const injuryTypes = await this.injuryTypeRepository.find({
      where,
      order: { injuryTypeCode: 'ASC' },
    });
    return injuryTypes.map((injuryType) => this.toResponse(injuryType));
  }

  async getSelectable(): Promise<InjuryTypeResponseDto[]> {
    return this.getAll({ level: 3, isActive: true });
  }

  async getById(id: number): Promise<InjuryTypeResponseDto> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(
    dto: CreateInjuryTypeDto,
    creatorId?: number,
  ): Promise<InjuryTypeResponseDto> {
    const codeSegment = dto.codeSegment.trim();
    const injuryTypeName = this.normalizeName(dto.injuryTypeName);
    const parentId = dto.parentId ?? null;

    const { injuryTypeCode, level } = await this.deriveCodeAndLevel(
      codeSegment,
      parentId,
    );
    await this.assertCodeAvailable(injuryTypeCode);
    await this.assertNameAvailable(injuryTypeName, parentId);

    const entity = this.injuryTypeRepository.create({
      injuryTypeCode,
      injuryTypeName,
      level,
      parentId,
      isActive: true,
      createdBy: creatorId ?? null,
      updatedBy: creatorId ?? null,
    });
    return this.toResponse(await this.injuryTypeRepository.save(entity));
  }

  async update(
    id: number,
    dto: UpdateInjuryTypeDto,
    updaterId?: number,
  ): Promise<InjuryTypeResponseDto> {
    const current = await this.findEntityOrFail(id);
    const injuryTypeName = this.normalizeName(dto.injuryTypeName);

    if (
      injuryTypeName.toLocaleLowerCase() !==
      current.injuryTypeName.toLocaleLowerCase()
    ) {
      await this.assertNameAvailable(injuryTypeName, current.parentId, id);
    }

    await this.injuryTypeRepository.update(id, {
      injuryTypeName,
      updatedBy: updaterId ?? null,
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async updateStatus(
    id: number,
    isActive: boolean,
    updaterId?: number,
  ): Promise<InjuryTypeResponseDto> {
    const current = await this.findEntityOrFail(id);
    if (current.isActive === isActive) {
      return this.toResponse(current);
    }

    if (isActive) {
      await this.validateStoredHierarchy(current);
    } else {
      const hasActiveChildren = await this.injuryTypeRepository.exists({
        where: { parentId: id, isActive: true },
      });
      if (hasActiveChildren) {
        throw new ConflictException({
          code: ErrorCode.INJURY_TYPE_HAS_CHILDREN,
          message:
            'Không thể ngừng sử dụng loại chấn thương đang có nhóm con hoạt động.',
        });
      }
    }

    await this.injuryTypeRepository.update(id, {
      isActive,
      updatedBy: updaterId ?? null,
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async remove(id: number): Promise<void> {
    const current = await this.findEntityOrFail(id);
    if (current.isActive) {
      throw new BadRequestException({
        code: ErrorCode.INJURY_TYPE_MUST_BE_INACTIVE,
        message: 'Phải ngừng sử dụng loại chấn thương trước khi xóa.',
      });
    }

    const hasChildren = await this.injuryTypeRepository.exists({
      where: { parentId: id },
    });
    if (hasChildren) {
      throw new ConflictException({
        code: ErrorCode.INJURY_TYPE_HAS_CHILDREN,
        message: 'Không thể xóa loại chấn thương đang có nhóm con.',
      });
    }

    await this.injuryTypeRepository.softDelete(id);
  }

  private async findEntityOrFail(id: number): Promise<InjuryTypeEntity> {
    const injuryType = await this.injuryTypeRepository.findOne({
      where: { id },
    });
    if (!injuryType) {
      throw new NotFoundException({
        code: ErrorCode.INJURY_TYPE_NOT_FOUND,
        message: 'Không tìm thấy loại chấn thương.',
      });
    }
    return injuryType;
  }

  private async assertCodeAvailable(injuryTypeCode: string): Promise<void> {
    const existing = await this.injuryTypeRepository.findOne({
      where: { injuryTypeCode },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.INJURY_TYPE_CODE_EXISTS,
        message: 'Mã loại chấn thương đã tồn tại.',
      });
    }
  }

  private async assertNameAvailable(
    injuryTypeName: string,
    parentId: number | null,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.injuryTypeRepository.findOne({
      where: {
        injuryTypeName: ILike(injuryTypeName),
        parentId: parentId === null ? IsNull() : parentId,
      },
      withDeleted: true,
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        code: ErrorCode.INJURY_TYPE_NAME_EXISTS,
        message: 'Tên loại chấn thương đã tồn tại trong cùng nhóm cha.',
      });
    }
  }

  private async deriveCodeAndLevel(
    codeSegment: string,
    parentId: number | null,
  ): Promise<{ injuryTypeCode: string; level: number }> {
    if (!/^\d$/.test(codeSegment)) {
      this.throwInvalidHierarchy(
        'Phần mã loại chấn thương phải gồm đúng 1 chữ số.',
      );
    }
    if (parentId === null) {
      return { injuryTypeCode: codeSegment, level: 1 };
    }

    const parent = await this.injuryTypeRepository.findOne({
      where: { id: parentId, isActive: true },
    });
    if (!parent) {
      this.throwInvalidHierarchy(
        'Nhóm cha phải tồn tại, đang hoạt động và chưa bị xóa.',
      );
    }
    if (parent.level >= 3) {
      this.throwInvalidHierarchy(
        'Loại chấn thương cấp 3 không thể có nhóm con.',
      );
    }

    await this.validateStoredHierarchy(parent);
    return {
      injuryTypeCode: `${parent.injuryTypeCode}${codeSegment}`,
      level: parent.level + 1,
    };
  }

  private async validateStoredHierarchy(
    injuryType: InjuryTypeEntity,
  ): Promise<void> {
    let current = injuryType;
    const visitedIds = new Set<number>();

    while (true) {
      if (visitedIds.has(current.id)) {
        this.throwInvalidHierarchy('Cây loại chấn thương đang chứa chu trình.');
      }
      visitedIds.add(current.id);

      if (current.level === 1) {
        if (current.parentId !== null || current.injuryTypeCode.length !== 1) {
          this.throwInvalidHierarchy(
            'Loại chấn thương cấp 1 phải có mã 1 chữ số và không có nhóm cha.',
          );
        }
        return;
      }

      if (current.parentId === null) {
        this.throwInvalidHierarchy(
          `Loại chấn thương cấp ${current.level} phải có nhóm cha.`,
        );
      }

      const parent = await this.injuryTypeRepository.findOne({
        where: { id: current.parentId, isActive: true },
      });
      if (!parent || parent.level !== current.level - 1) {
        this.throwInvalidHierarchy(
          `Nhóm cha phải đang hoạt động và thuộc cấp ${current.level - 1}.`,
        );
      }
      this.validateCodeForParent(current.injuryTypeCode, parent, current.level);
      current = parent;
    }
  }

  private validateCodeForParent(
    code: string,
    parent: InjuryTypeEntity,
    level: number,
  ): void {
    if (code.length !== level || !code.startsWith(parent.injuryTypeCode)) {
      this.throwInvalidHierarchy(
        `Mã cấp ${level} phải gồm ${level} chữ số và bắt đầu bằng mã cha ${parent.injuryTypeCode}.`,
      );
    }
  }

  private throwInvalidHierarchy(message: string): never {
    throw new BadRequestException({
      code: ErrorCode.INVALID_INJURY_TYPE_HIERARCHY,
      message,
    });
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toResponse(entity: InjuryTypeEntity): InjuryTypeResponseDto {
    const {
      id,
      injuryTypeCode,
      injuryTypeName,
      level,
      parentId,
      isActive,
      createdAt,
      updatedAt,
    } = entity;
    return {
      id,
      injuryTypeCode,
      injuryTypeName,
      level,
      parentId,
      isActive,
      createdAt,
      updatedAt,
    };
  }
}
