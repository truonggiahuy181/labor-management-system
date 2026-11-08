import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { OccupationalAccidentReportEntity } from '../occupational-accident-report/entities/occupational-accident-report.entity.js';
import { CreateReportPeriodDto } from './dto/create-report-period.dto.js';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto.js';
import { ReportPeriodResponseDto } from './dto/report-period-response.dto.js';
import { UpdateReportPeriodDto } from './dto/update-report-period.dto.js';
import {
  ReportPeriodCode,
  ReportTypeCode,
  type ReportPeriodCode as ReportPeriodCodeValue,
  type ReportTypeCode as ReportTypeCodeValue,
} from './report-period.constants.js';
import { ReportPeriodEntity } from './report-period.entity.js';

interface ReportPeriodDefinition {
  reportTypeCode: ReportTypeCodeValue;
  periodCode: ReportPeriodCodeValue;
  reportYear: number;
  submissionStartDate: string;
  submissionEndDate: string;
}

@Injectable()
export class ReportPeriodService {
  constructor(
    @InjectRepository(ReportPeriodEntity)
    private readonly reportPeriodRepository: Repository<ReportPeriodEntity>,
    @InjectRepository(OccupationalAccidentReportEntity)
    private readonly accidentReportRepository: Repository<OccupationalAccidentReportEntity>,
  ) {}

  async getAll(
    query: ReportPeriodQueryDto = {},
  ): Promise<ReportPeriodResponseDto[]> {
    const where: FindOptionsWhere<ReportPeriodEntity> = {};
    if (query.reportName?.trim()) {
      where.reportName = ILike(query.reportName.trim());
    }
    if (query.reportYear !== undefined) where.reportYear = query.reportYear;
    if (query.reportTypeCode !== undefined) {
      where.reportTypeCode = query.reportTypeCode;
    }
    if (query.periodCode !== undefined) where.periodCode = query.periodCode;
    if (query.submissionStartDate !== undefined) {
      where.submissionStartDate = query.submissionStartDate;
    }
    if (query.submissionEndDate !== undefined) {
      where.submissionEndDate = query.submissionEndDate;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else if (!query.includeInactive) {
      where.isActive = true;
    }

    const search = query.search?.trim();
    const rows = await this.reportPeriodRepository.find({
      where: search
        ? [{ ...where, reportName: ILike(`%${search}%`) }]
        : where,
      order: {
        reportYear: 'DESC',
        submissionStartDate: 'DESC',
        id: 'DESC',
      },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async getById(id: number): Promise<ReportPeriodResponseDto> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(
    dto: CreateReportPeriodDto,
    creatorId?: number,
  ): Promise<ReportPeriodResponseDto> {
    const reportName = this.normalizeText(dto.reportName);
    this.assertValidDefinition(dto);
    await this.assertUnique(
      dto.reportTypeCode,
      dto.reportYear,
      dto.periodCode,
    );

    const entity = this.reportPeriodRepository.create({
      reportName,
      reportYear: dto.reportYear,
      reportTypeCode: dto.reportTypeCode,
      periodCode: dto.periodCode,
      submissionStartDate: dto.submissionStartDate,
      submissionEndDate: dto.submissionEndDate,
      isActive: dto.isActive ?? true,
      createdBy: creatorId ?? null,
      updatedBy: creatorId ?? null,
    });
    return this.toResponse(await this.reportPeriodRepository.save(entity));
  }

  async update(
    id: number,
    dto: UpdateReportPeriodDto,
    updaterId?: number,
  ): Promise<ReportPeriodResponseDto> {
    const current = await this.findEntityOrFail(id);
    const reportName =
      dto.reportName === undefined
        ? current.reportName
        : this.normalizeText(dto.reportName);
    const definition: ReportPeriodDefinition = {
      reportTypeCode: dto.reportTypeCode ?? current.reportTypeCode,
      periodCode: dto.periodCode ?? current.periodCode,
      reportYear: dto.reportYear ?? current.reportYear,
      submissionStartDate:
        dto.submissionStartDate ?? current.submissionStartDate,
      submissionEndDate: dto.submissionEndDate ?? current.submissionEndDate,
    };

    const definitionChanged =
      reportName !== current.reportName ||
      definition.reportYear !== current.reportYear ||
      definition.reportTypeCode !== current.reportTypeCode ||
      definition.periodCode !== current.periodCode;
    if (definitionChanged && (await this.isInUse(id))) {
      throw new ConflictException({
        code: ErrorCode.REPORT_PERIOD_IN_USE,
        message:
          'Không thể thay đổi định nghĩa kỳ báo cáo đã được doanh nghiệp sử dụng.',
      });
    }

    this.assertValidDefinition(definition);
    await this.assertUnique(
      definition.reportTypeCode,
      definition.reportYear,
      definition.periodCode,
      id,
    );

    const updateData: Partial<ReportPeriodEntity> = {
      reportName,
      ...definition,
      updatedBy: updaterId ?? null,
    };
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    await this.reportPeriodRepository.update(id, updateData);
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async updateStatus(
    id: number,
    isActive: boolean,
    updaterId?: number,
  ): Promise<ReportPeriodResponseDto> {
    await this.findEntityOrFail(id);
    await this.reportPeriodRepository.update(id, {
      isActive,
      updatedBy: updaterId ?? null,
    });
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async remove(id: number): Promise<void> {
    const period = await this.findEntityOrFail(id);
    if (period.isActive) {
      throw new BadRequestException({
        code: ErrorCode.REPORT_PERIOD_MUST_BE_INACTIVE,
        message: 'Phải ngừng hoạt động kỳ báo cáo trước khi xóa.',
      });
    }
    if (await this.isInUse(id)) {
      throw new ConflictException({
        code: ErrorCode.REPORT_PERIOD_IN_USE,
        message: 'Không thể xóa kỳ báo cáo đã được doanh nghiệp sử dụng.',
      });
    }
    await this.reportPeriodRepository.softDelete(id);
  }

  private async findEntityOrFail(id: number): Promise<ReportPeriodEntity> {
    const row = await this.reportPeriodRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.REPORT_PERIOD_NOT_FOUND,
        message: 'Không tìm thấy kỳ báo cáo.',
      });
    }
    return row;
  }

  private isInUse(id: number): Promise<boolean> {
    return this.accidentReportRepository.exists({
      where: { reportPeriodId: id },
    });
  }

  private async assertUnique(
    reportTypeCode: ReportTypeCodeValue,
    reportYear: number,
    periodCode: ReportPeriodCodeValue,
    excludeId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<ReportPeriodEntity> = {
      reportTypeCode,
      reportYear,
      periodCode,
    };
    if (excludeId !== undefined) where.id = Not(excludeId);
    if (await this.reportPeriodRepository.findOne({ where })) {
      throw new ConflictException({
        code: ErrorCode.REPORT_PERIOD_EXISTS,
        message: 'Loại báo cáo, năm và kỳ báo cáo đã tồn tại.',
      });
    }
  }

  private assertValidDefinition(definition: ReportPeriodDefinition): void {
    if (definition.submissionEndDate < definition.submissionStartDate) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_REPORT_PERIOD_DATE_RANGE,
        message: 'Ngày kết thúc không được trước ngày bắt đầu.',
      });
    }

    if (definition.reportTypeCode !== ReportTypeCode.OCCUPATIONAL_ACCIDENT) {
      if (definition.periodCode !== ReportPeriodCode.CUSTOM) {
        throw new BadRequestException({
          code: ErrorCode.INVALID_REPORT_PERIOD_DATE_RANGE,
          message: 'Loại báo cáo khác chỉ hỗ trợ kỳ tùy chỉnh.',
        });
      }
      return;
    }
    if (definition.periodCode === ReportPeriodCode.CUSTOM) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OCCUPATIONAL_ACCIDENT_REPORT_PERIOD,
        message:
          'Báo cáo tai nạn lao động chỉ hỗ trợ kỳ 6 tháng đầu năm hoặc cả năm.',
      });
    }

    const statutoryWindow =
      definition.periodCode === ReportPeriodCode.FIRST_HALF
        ? {
            first: `${definition.reportYear}-07-01`,
            deadlineExclusive: `${definition.reportYear}-07-05`,
            message:
              'Kỳ 6 tháng đầu năm chỉ nhận từ 01/07 đến trước 05/07 cùng năm.',
          }
        : {
            first: `${definition.reportYear + 1}-01-01`,
            deadlineExclusive: `${definition.reportYear + 1}-01-10`,
            message:
              'Kỳ cả năm chỉ nhận từ 01/01 đến trước 10/01 năm tiếp theo.',
          };
    if (
      definition.submissionStartDate < statutoryWindow.first ||
      definition.submissionStartDate >= statutoryWindow.deadlineExclusive ||
      definition.submissionEndDate < statutoryWindow.first ||
      definition.submissionEndDate >= statutoryWindow.deadlineExclusive
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_REPORT_PERIOD_DATE_RANGE,
        message: statutoryWindow.message,
      });
    }
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toResponse(entity: ReportPeriodEntity): ReportPeriodResponseDto {
    return {
      id: entity.id,
      reportName: entity.reportName,
      reportYear: entity.reportYear,
      reportTypeCode: entity.reportTypeCode,
      periodCode: entity.periodCode,
      submissionStartDate: entity.submissionStartDate,
      submissionEndDate: entity.submissionEndDate,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
