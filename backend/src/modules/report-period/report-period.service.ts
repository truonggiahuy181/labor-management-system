import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { CreateReportPeriodDto } from './dto/create-report-period.dto.js';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto.js';
import { ReportPeriodResponseDto } from './dto/report-period-response.dto.js';
import { UpdateReportPeriodDto } from './dto/update-report-period.dto.js';
import { ReportPeriodEntity } from './report-period.entity.js';

@Injectable()
export class ReportPeriodService {
  constructor(
    @InjectRepository(ReportPeriodEntity)
    private readonly reportPeriodRepository: Repository<ReportPeriodEntity>,
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
    this.assertValidDateRange(dto.startDate, dto.endDate);
    await this.assertUnique(reportName, dto.reportYear, reportPeriod);

    const entity = this.reportPeriodRepository.create({
      reportName,
      reportYear: dto.reportYear,
      reportPeriod,
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
    const startDate = dto.startDate ?? current.startDate;
    const endDate = dto.endDate ?? current.endDate;

    this.assertValidDateRange(startDate, endDate);
    await this.assertUnique(reportName, reportYear, reportPeriod, id);

    const updateData: Partial<ReportPeriodEntity> = {
      reportName,
      reportYear,
      reportPeriod,
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

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toResponse(entity: ReportPeriodEntity): ReportPeriodResponseDto {
    const {
      id,
      reportName,
      reportYear,
      reportPeriod,
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
      startDate,
      endDate,
      isActive,
      createdAt,
      updatedAt,
    };
  }
}
