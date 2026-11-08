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
import { ReportPeriodEntity } from './report-period.entity.js';
import {
  ReportPeriodCode,
  ReportTypeCode,
  type ReportPeriodCode as ReportPeriodCodeValue,
  type ReportTypeCode as ReportTypeCodeValue,
} from './report-period.constants.js';

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
    const baseWhere: FindOptionsWhere<ReportPeriodEntity> = {};

    if (query.reportName?.trim()) {
      baseWhere.reportName = ILike(query.reportName.trim());
    }
    if (query.reportYear !== undefined) {
      baseWhere.reportYear = query.reportYear;
    }
    if (query.reportPeriod?.trim()) {
      baseWhere.reportPeriod = ILike(query.reportPeriod.trim());
    }
    if (query.reportTypeCode !== undefined) {
      baseWhere.reportTypeCode = query.reportTypeCode;
    }
    if (query.periodCode !== undefined) {
      baseWhere.periodCode = query.periodCode;
    }
    if (query.startDate !== undefined) {
      baseWhere.startDate = query.startDate;
    }
    if (query.endDate !== undefined) {
      baseWhere.endDate = query.endDate;
    }
    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    } else if (!query.includeInactive) {
      baseWhere.isActive = true;
    }

    const search = query.search?.trim();
    const where:
      | FindOptionsWhere<ReportPeriodEntity>
      | FindOptionsWhere<ReportPeriodEntity>[] = search
      ? [
          { ...baseWhere, reportName: ILike(`%${search}%`) },
          { ...baseWhere, reportPeriod: ILike(`%${search}%`) },
        ]
      : baseWhere;

    const reportPeriods = await this.reportPeriodRepository.find({
      where,
      order: { reportYear: 'DESC', startDate: 'DESC', id: 'DESC' },
    });
    return reportPeriods.map((reportPeriod) => this.toResponse(reportPeriod));
  }

  async getById(id: number): Promise<ReportPeriodResponseDto> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(
    dto: CreateReportPeriodDto,
    creatorId?: number,
  ): Promise<ReportPeriodResponseDto> {
    const reportName = this.normalizeText(dto.reportName);
    const reportPeriod = this.normalizeText(dto.reportPeriod);
    const reportTypeCode = this.inferReportTypeCode(reportName);
    const periodCode = this.inferPeriodCode(reportPeriod, reportTypeCode);
    this.assertValidDefinition({
      reportTypeCode,
      periodCode,
      reportYear: dto.reportYear,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
    await this.assertUnique(reportName, dto.reportYear, reportPeriod);

    const entity = this.reportPeriodRepository.create({
      reportName,
      reportYear: dto.reportYear,
      reportPeriod,
      reportTypeCode,
      periodCode,
      startDate: dto.startDate,
      endDate: dto.endDate,
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
    const reportYear = dto.reportYear ?? current.reportYear;
    const reportPeriod =
      dto.reportPeriod === undefined
        ? current.reportPeriod
        : this.normalizeText(dto.reportPeriod);
    const reportTypeCode = this.inferReportTypeCode(reportName);
    const periodCode = this.inferPeriodCode(reportPeriod, reportTypeCode);
    const startDate = dto.startDate ?? current.startDate;
    const endDate = dto.endDate ?? current.endDate;

    const definitionChanged =
      reportName !== current.reportName ||
      reportYear !== current.reportYear ||
      reportPeriod !== current.reportPeriod ||
      reportTypeCode !== current.reportTypeCode ||
      periodCode !== current.periodCode;
    if (
      definitionChanged &&
      (await this.accidentReportRepository.exists({
        where: { reportPeriodId: id },
      }))
    ) {
      throw new ConflictException({
        code: ErrorCode.REPORT_PERIOD_IN_USE,
        message:
          'Không thể thay đổi nội dung kỳ báo cáo đã có doanh nghiệp kê khai; chỉ được điều chỉnh trạng thái và thời gian nhận báo cáo.',
      });
    }

    this.assertValidDefinition({
      reportTypeCode,
      periodCode,
      reportYear,
      startDate,
      endDate,
    });
    await this.assertUnique(reportName, reportYear, reportPeriod, id);

    const updateData: Partial<ReportPeriodEntity> = {
      reportName,
      reportYear,
      reportPeriod,
      reportTypeCode,
      periodCode,
      startDate,
      endDate,
      updatedBy: updaterId ?? null,
    };
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

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
    const reportPeriod = await this.findEntityOrFail(id);
    if (reportPeriod.isActive) {
      throw new BadRequestException({
        code: ErrorCode.REPORT_PERIOD_MUST_BE_INACTIVE,
        message: 'Phải ngừng hoạt động kỳ báo cáo trước khi xóa.',
      });
    }
    const inUse = await this.accidentReportRepository.exists({
      where: { reportPeriodId: id },
    });
    if (inUse) {
      throw new ConflictException({
        code: ErrorCode.REPORT_PERIOD_IN_USE,
        message: 'Không thể xóa kỳ báo cáo đã có doanh nghiệp kê khai.',
      });
    }
    await this.reportPeriodRepository.softDelete(id);
  }

  private async findEntityOrFail(id: number): Promise<ReportPeriodEntity> {
    const reportPeriod = await this.reportPeriodRepository.findOne({
      where: { id },
    });
    if (!reportPeriod) {
      throw new NotFoundException({
        code: ErrorCode.REPORT_PERIOD_NOT_FOUND,
        message: 'Không tìm thấy kỳ báo cáo.',
      });
    }
    return reportPeriod;
  }

  private async assertUnique(
    reportName: string,
    reportYear: number,
    reportPeriod: string,
    excludeId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<ReportPeriodEntity> = {
      reportName: ILike(reportName),
      reportYear,
      reportPeriod: ILike(reportPeriod),
    };
    if (excludeId !== undefined) {
      where.id = Not(excludeId);
    }

    const existing = await this.reportPeriodRepository.findOne({ where });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.REPORT_PERIOD_EXISTS,
        message: 'Tên báo cáo, năm và kỳ báo cáo đã tồn tại.',
      });
    }
  }

  private assertValidDateRange(startDate: string, endDate: string): void {
    if (endDate < startDate) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_REPORT_PERIOD_DATE_RANGE,
        message: 'Ngày kết thúc không được trước ngày bắt đầu.',
      });
    }
  }

  private assertValidDefinition(definition: {
    reportTypeCode: ReportTypeCodeValue;
    periodCode: ReportPeriodCodeValue;
    reportYear: number;
    startDate: string;
    endDate: string;
  }): void {
    this.assertValidDateRange(definition.startDate, definition.endDate);

    if (definition.reportTypeCode !== ReportTypeCode.OCCUPATIONAL_ACCIDENT) {
      return;
    }

    if (definition.periodCode === ReportPeriodCode.CUSTOM) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OCCUPATIONAL_ACCIDENT_REPORT_PERIOD,
        message:
          'Báo cáo tai nạn lao động chỉ hỗ trợ kỳ 6 tháng đầu năm hoặc cả năm.',
      });
    }

    // Khoản 1 Điều 24 Nghị định 39/2016/NĐ-CP: gửi trước 05/07
    // cho kỳ 6 tháng và trước 10/01 năm kế tiếp cho kỳ cả năm.
    const statutoryWindow =
      definition.periodCode === ReportPeriodCode.FIRST_HALF
        ? {
            firstSubmissionDate: `${definition.reportYear}-07-01`,
            deadlineExclusive: `${definition.reportYear}-07-05`,
            message:
              'Báo cáo 6 tháng đầu năm chỉ được nhận từ ngày 01/07 đến trước ngày 05/07 cùng năm.',
          }
        : {
            firstSubmissionDate: `${definition.reportYear + 1}-01-01`,
            deadlineExclusive: `${definition.reportYear + 1}-01-10`,
            message:
              'Báo cáo cả năm chỉ được nhận từ ngày 01/01 đến trước ngày 10/01 năm kế tiếp.',
          };

    if (
      definition.startDate < statutoryWindow.firstSubmissionDate ||
      definition.startDate >= statutoryWindow.deadlineExclusive ||
      definition.endDate < statutoryWindow.firstSubmissionDate ||
      definition.endDate >= statutoryWindow.deadlineExclusive
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_REPORT_PERIOD_DATE_RANGE,
        message: statutoryWindow.message,
      });
    }
  }

  private inferReportTypeCode(reportName: string): ReportTypeCodeValue {
    const normalized = reportName.toLocaleLowerCase('vi');
    return normalized.includes('tai nạn lao động') ||
      normalized.includes('tnlđ') ||
      normalized.includes('tnld')
      ? ReportTypeCode.OCCUPATIONAL_ACCIDENT
      : ReportTypeCode.OTHER;
  }

  private inferPeriodCode(
    reportPeriod: string,
    reportTypeCode: ReportTypeCodeValue,
  ): ReportPeriodCodeValue {
    if (reportTypeCode !== ReportTypeCode.OCCUPATIONAL_ACCIDENT) {
      return ReportPeriodCode.CUSTOM;
    }

    const normalized = reportPeriod.toLocaleLowerCase('vi');
    if (normalized.includes('6 tháng đầu')) {
      return ReportPeriodCode.FIRST_HALF;
    }
    if (normalized.includes('cả năm')) {
      return ReportPeriodCode.ANNUAL;
    }
    return ReportPeriodCode.CUSTOM;
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toResponse(entity: ReportPeriodEntity): ReportPeriodResponseDto {
    const {
      id,
      reportName,
      reportYear,
      reportPeriod,
      reportTypeCode,
      periodCode,
      startDate,
      endDate,
      isActive,
      createdAt,
      updatedAt,
    } = entity;
    return {
      id,
      reportName,
      reportYear,
      reportPeriod,
      reportTypeCode,
      periodCode,
      startDate,
      endDate,
      isActive,
      createdAt,
      updatedAt,
    };
  }
}
