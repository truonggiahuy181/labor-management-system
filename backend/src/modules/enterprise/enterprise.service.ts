import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { UserEntity } from '../user/user.entity.js';
import { UserService } from '../user/user.service.js';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto.js';
import { EnterpriseQueryDto } from './dto/enterprise-query.dto.js';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto.js';
import { EnterpriseEntity } from './enterprise.entity.js';
import { EnterpriseMapper, EnterpriseResponse } from './enterprise.mapper.js';
import { BusinessTypeService } from '../business-type/business-type.service.js';
import { IndustryService } from '../industry/industry.service.js';
import { RoleService } from '../role/role.service.js';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { LocationService } from '../location/location.service.js';
import { FileService } from '../file/file.service.js';
import type { MultipartFile } from '../file/file.types.js';
import type { EnterpriseFileType } from './dto/enterprise-file-param.dto.js';

const INITIAL_ENTERPRISE_PASSWORD = '12345678';

export interface CreateEnterpriseResult {
  enterprise: EnterpriseResponse;
  initialAccess: {
    username: string;
    temporaryPassword: string;
  };
}

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly businessTypeService: BusinessTypeService,
    private readonly industryService: IndustryService,
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly locationService: LocationService,
    private readonly fileService: FileService,
  ) { }

  async getAll(query: EnterpriseQueryDto = {}): Promise<EnterpriseResponse[]> {
    const baseWhere: FindOptionsWhere<EnterpriseEntity> = {};
    if (query.businessTypeId !== undefined) {
      baseWhere.businessTypeId = query.businessTypeId;
    }
    if (query.industryId !== undefined) {
      baseWhere.industryId = query.industryId;
    }
    if (query.provinceId !== undefined) {
      baseWhere.provinceId = query.provinceId.trim();
    }
    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    }

    const search = query.search?.trim();
    const where:
      | FindOptionsWhere<EnterpriseEntity>
      | FindOptionsWhere<EnterpriseEntity>[] = search
        ? [
          { ...baseWhere, enterpriseName: ILike(`%${search}%`) },
          { ...baseWhere, taxCode: ILike(`%${search}%`) },
          { ...baseWhere, email: ILike(`%${search}%`) },
          { ...baseWhere, representativeName: ILike(`%${search}%`) },
        ]
        : baseWhere;

    const enterprises = await this.enterpriseRepository.find({
      where,
      order: { id: 'DESC' },
    });
    return enterprises.map((enterprise) => this.toResponse(enterprise));
  }

  async getById(id: number): Promise<EnterpriseResponse> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(
    dto: CreateEnterpriseDto,
    creatorId?: number,
  ): Promise<CreateEnterpriseResult> {
    await this.locationService.assertValidSelection(
      dto.provinceId,
      dto.wardId,
    );
    await this.locationService.assertValidSelection(
      dto.operatingProvinceId,
      dto.operatingWardId,
    );

    await this.businessTypeService.getActiveByIdOrFail(dto.businessTypeId);
    await this.industryService.getLevelFourByIdOrFail(dto.industryId);
    await this.assertTaxCodeAvailable(dto.taxCode);
    await this.assertEmailAvailable(dto.email);

    const enterpriseRole = await this.roleService.getByCodeOrFail(
      RoleCode.ENTERPRISE_USER,
    );

    const passwordHash = await argon2.hash(INITIAL_ENTERPRISE_PASSWORD);

    const enterprise = await this.dataSource.transaction(async (manager) => {
      const newEnterprise = await manager.save(
        manager.create(EnterpriseEntity, {
          ...dto,
          email: dto.email.trim().toLowerCase(),
          foreignName: dto.foreignName ?? null,
          phoneNumber: dto.phoneNumber ?? null,
          representativeName: dto.representativeName ?? null,
          representativePhone: dto.representativePhone ?? null,
          operatingProvinceId: dto.operatingProvinceId ?? null,
          operatingWardId: dto.operatingWardId ?? null,
          operatingAddress: dto.operatingAddress ?? null,
          files: {},
          isActive: true,
          createdBy: creatorId ?? null,
          updatedBy: creatorId ?? null,
        }),
      );

      await manager.save(
        manager.create(UserEntity, {
          username: dto.taxCode,
          passwordHash,
          fullName: dto.representativeName || dto.enterpriseName,
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.representativePhone ?? null,
          roleId: enterpriseRole.id,
          enterpriseId: newEnterprise.id,
          isActive: true,
          createdBy: creatorId ?? null,
          updatedBy: creatorId ?? null,
        }),
      );

      return newEnterprise;
    });
    return {
      enterprise: this.toResponse(enterprise),
      initialAccess: {
        username: dto.taxCode,
        temporaryPassword: INITIAL_ENTERPRISE_PASSWORD,
      },
    };
  }

  async update(
    id: number,
    dto: UpdateEnterpriseDto,
    updaterId?: number,
  ): Promise<EnterpriseResponse> {
    const enterprise = await this.findEntityOrFail(id);

    if (dto.provinceId !== undefined || dto.wardId !== undefined) {
      await this.locationService.assertValidSelection(
        dto.provinceId ?? enterprise.provinceId,
        dto.wardId ?? enterprise.wardId,
      );
    }
    if (
      dto.operatingProvinceId !== undefined ||
      dto.operatingWardId !== undefined
    ) {
      await this.locationService.assertValidSelection(
        dto.operatingProvinceId ?? enterprise.operatingProvinceId,
        dto.operatingWardId ?? enterprise.operatingWardId,
      );
    }
    if (dto.businessTypeId !== undefined) {
      await this.businessTypeService.getActiveByIdOrFail(dto.businessTypeId);
    }
    if (dto.industryId !== undefined) {
      await this.industryService.getLevelFourByIdOrFail(dto.industryId);
    }

    const updateData = {
      ...dto,
      updatedBy: updaterId ?? null,
    } as Partial<EnterpriseEntity> & { taxCode?: string };

    // Bảo vệ thêm ở tầng service nếu được gọi trực tiếp mà không qua ValidationPipe.
    delete updateData.taxCode;
    Object.keys(updateData).forEach((key) => {
      if ((updateData as Record<string, unknown>)[key] === undefined) {
        delete (updateData as Record<string, unknown>)[key];
      }
    });

    const newEmail = dto.email?.trim().toLowerCase();
    if (newEmail === undefined || newEmail === enterprise.email) {
      delete updateData.email;
      await this.enterpriseRepository.update(id, updateData);
      return this.toResponse(await this.findEntityOrFail(id));
    }

    // Đổi email: email mới chưa ai dùng, đổi cùng lúc email doanh nghiệp và
    // email tài khoản doanh nghiệp (tên đăng nhập = mã số thuế) để OTP / quên mật khẩu gửi đúng nơi
    await this.assertEmailAvailable(newEmail, id);
    updateData.email = newEmail;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(EnterpriseEntity, id, updateData);
      await manager.update(
        UserEntity,
        { enterpriseId: id, username: enterprise.taxCode },
        { email: newEmail, updatedBy: updaterId ?? null },
      );
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async updateStatus(
    id: number,
    isActive: boolean,
    updaterId?: number,
  ): Promise<EnterpriseResponse> {
    await this.findEntityOrFail(id);
    await this.enterpriseRepository.update(id, {
      isActive,
      updatedBy: updaterId ?? null,
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async uploadFile(
    id: number,
    fileType: EnterpriseFileType,
    file: MultipartFile | undefined,
    updaterId?: number,
  ): Promise<EnterpriseResponse> {
    const enterprise = await this.findEntityOrFail(id);
    const previousFile = enterprise.files?.[fileType];
    const uploaded = await this.fileService.upload(
      file,
      'enterprise-files',
      id,
    );

    await this.enterpriseRepository.update(id, {
      files: {
        ...enterprise.files,
        [fileType]: {
          objectKey: uploaded.objectKey,
          originalName: uploaded.originalName,
          contentType: uploaded.contentType,
          size: uploaded.size,
        },
      },
      updatedBy: updaterId ?? null,
    });
    if (previousFile) {
      await this.fileService.deleteEnterpriseFile(previousFile.objectKey);
    }

    return this.toResponse(await this.findEntityOrFail(id));
  }

  async removeFile(
    id: number,
    fileType: EnterpriseFileType,
    updaterId?: number,
  ): Promise<EnterpriseResponse> {
    const enterprise = await this.findEntityOrFail(id);
    const removedFile = enterprise.files?.[fileType];
    const files = { ...enterprise.files };
    delete files[fileType];

    await this.enterpriseRepository.update(id, {
      files,
      updatedBy: updaterId ?? null,
    });
    if (removedFile) {
      await this.fileService.deleteEnterpriseFile(removedFile.objectKey);
    }

    return this.toResponse(await this.findEntityOrFail(id));
  }

  async remove(id: number): Promise<void> {
    const enterprise = await this.findEntityOrFail(id);
    if (enterprise.isActive) {
      throw new BadRequestException({
        code: ErrorCode.ENTERPRISE_MUST_BE_INACTIVE,
        message: 'Phải ngừng hoạt động doanh nghiệp trước khi xóa.',
      });
    }

    const isUsed = await this.userRepository.exists({
      where: { enterpriseId: id },
    });
    if (isUsed) {
      throw new ConflictException({
        code: ErrorCode.ENTERPRISE_IN_USE,
        message: 'Không thể xóa doanh nghiệp đang có người dùng trực thuộc.',
      });
    }

    await this.enterpriseRepository.softDelete(id);
  }

  async getMyEnterprise(userId: number): Promise<EnterpriseResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user || !user.enterpriseId) {
      throw new NotFoundException({
        code: ErrorCode.ENTERPRISE_NOT_FOUND,
        message: 'Tài khoản không thuộc doanh nghiệp nào.',
      });
    }
    return this.getById(user.enterpriseId);
  }

  async updateMyEnterprise(
    userId: number,
    dto: UpdateEnterpriseDto,
  ): Promise<EnterpriseResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user || !user.enterpriseId) {
      throw new NotFoundException({
        code: ErrorCode.ENTERPRISE_NOT_FOUND,
        message: 'Tài khoản không thuộc doanh nghiệp nào.',
      });
    }
    const updatePayload = { ...dto };
    delete (updatePayload as Record<string, unknown>).email;
    return this.update(user.enterpriseId, updatePayload, userId);
  }

  private async findEntityOrFail(id: number): Promise<EnterpriseEntity> {
    const enterprise = await this.enterpriseRepository.findOne({
      where: { id },
    });
    if (!enterprise) {
      throw new NotFoundException({
        code: ErrorCode.ENTERPRISE_NOT_FOUND,
        message: 'Không tìm thấy doanh nghiệp.',
      });
    }
    return enterprise;
  }


  private toResponse(enterprise: EnterpriseEntity): EnterpriseResponse {
    const files = Object.fromEntries(
      Object.entries(enterprise.files ?? {}).map(([fileType, file]) => [
        fileType,
        {
          ...file,
          originalName: this.fileService.normalizeOriginalFileName(
            file.originalName,
          ),
          accessUrl: this.fileService.getEnterpriseFileAccessUrl(
            file.objectKey,
          ),
        },
      ]),
    );
    return EnterpriseMapper.toResponse(enterprise, files);
  }

  async assertTaxCodeAvailable(taxCode: string): Promise<void> {
    const [enterprise, user] = await Promise.all([
      this.enterpriseRepository.findOne({
        where: { taxCode },
        withDeleted: true,
      }),
      this.userService.findByUsername(taxCode),
    ]);
    if (enterprise || user) {
      throw new ConflictException({
        code: ErrorCode.TAX_CODE_EXISTS,
        message: 'Mã số thuế đã tồn tại trong hệ thống.',
      });
    }
  }

  async assertEmailAvailable(email: string, excludeEnterpriseId?: number): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const [user, enterprise] = await Promise.all([
      this.userService.findByEmail(normalizedEmail),
      this.enterpriseRepository.findOne({
        where: { email: normalizedEmail },
        withDeleted: false,
      }),
    ]);
    const enterpriseConflict =
      enterprise && (!excludeEnterpriseId || enterprise.id !== excludeEnterpriseId);
    if (user || enterpriseConflict) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_EXISTS,
        message: 'Email đã được sử dụng.',
      });
    }
  }
}
