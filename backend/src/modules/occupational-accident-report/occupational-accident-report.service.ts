import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Not,
  QueryFailedError,
  Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { createHash } from 'node:crypto';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { AccidentCauseEntity } from '../accident-cause/accident-cause.entity.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';
import { InjuryFactorEntity } from '../injury-factor/injury-factor.entity.js';
import { OccupationEntity } from '../occupation/occupation.entity.js';
import {
  ReportPeriodCode,
  ReportTypeCode,
} from '../report-period/report-period.constants.js';
import { ReportPeriodEntity } from '../report-period/report-period.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { FileService } from '../file/file.service.js';
import type { MultipartFile } from '../file/file.types.js';
import { AccidentVictimGroupDto } from './dto/accident-victim-group.dto.js';
import { AdminOccupationalAccidentReportQueryDto } from './dto/admin-occupational-accident-report-query.dto.js';
import { CreateOccupationalAccidentReportDto } from './dto/create-occupational-accident-report.dto.js';
import { OccupationalAccidentReportQueryDto } from './dto/occupational-accident-report-query.dto.js';
import { SaveAccidentCaseDto } from './dto/save-accident-case.dto.js';
import { UpdateArticle39SummaryDto } from './dto/update-article39-summary.dto.js';
import { UpdateReportHeaderDto } from './dto/update-report-header.dto.js';
import { OccupationalAccidentCaseEntity } from './entities/occupational-accident-case.entity.js';
import { OccupationalAccidentReportHistoryEntity } from './entities/occupational-accident-report-history.entity.js';
import { OccupationalAccidentReportEntity } from './entities/occupational-accident-report.entity.js';
import { OccupationalAccidentVictimGroupEntity } from './entities/occupational-accident-victim-group.entity.js';
import { OccupationalAccidentArticle39SummaryEntity } from './entities/occupational-accident-article39-summary.entity.js';
import { OccupationalAccidentReportSubmissionEntity } from './entities/occupational-accident-report-submission.entity.js';
import { OccupationalAccidentReportDraftDocumentEntity } from './entities/occupational-accident-report-draft-document.entity.js';
import {
  OccupationalAccidentReportListStatus,
  OccupationalAccidentReportStatus,
} from './occupational-accident-report.constants.js';
import type {
  AccidentBreakdownRow,
  AccidentCountMetrics,
  AccidentFrequencyMetrics,
  AccidentSummary,
  AdminOccupationalAccidentReportPage,
  AdminOccupationalAccidentSummary,
  OccupationalAccidentOverview,
  OccupationalAccidentReportListItem,
} from './occupational-accident-report.types.js';

type BreakdownValue = AccidentBreakdownRow;

@Injectable()
export class OccupationalAccidentReportService {
  constructor(
    @InjectRepository(OccupationalAccidentReportEntity)
    private readonly reportRepository: Repository<OccupationalAccidentReportEntity>,
    @InjectRepository(OccupationalAccidentCaseEntity)
    private readonly caseRepository: Repository<OccupationalAccidentCaseEntity>,
    @InjectRepository(OccupationalAccidentVictimGroupEntity)
    private readonly victimGroupRepository: Repository<OccupationalAccidentVictimGroupEntity>,
    @InjectRepository(OccupationalAccidentReportHistoryEntity)
    private readonly historyRepository: Repository<OccupationalAccidentReportHistoryEntity>,
    @InjectRepository(OccupationalAccidentArticle39SummaryEntity)
    private readonly article39Repository: Repository<OccupationalAccidentArticle39SummaryEntity>,
    @InjectRepository(OccupationalAccidentReportSubmissionEntity)
    private readonly submissionRepository: Repository<OccupationalAccidentReportSubmissionEntity>,
    @InjectRepository(OccupationalAccidentReportDraftDocumentEntity)
    private readonly draftDocumentRepository: Repository<OccupationalAccidentReportDraftDocumentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
    @InjectRepository(ReportPeriodEntity)
    private readonly reportPeriodRepository: Repository<ReportPeriodEntity>,
    @InjectRepository(AccidentCauseEntity)
    private readonly causeRepository: Repository<AccidentCauseEntity>,
    @InjectRepository(InjuryFactorEntity)
    private readonly injuryFactorRepository: Repository<InjuryFactorEntity>,
    @InjectRepository(OccupationEntity)
    private readonly occupationRepository: Repository<OccupationEntity>,
    private readonly dataSource: DataSource,
    private readonly fileService: FileService,
  ) {}

  async getMyReports(
    userId: number,
    query: OccupationalAccidentReportQueryDto = {},
  ): Promise<OccupationalAccidentReportListItem[]> {
    const enterprise = await this.resolveEnterprise(userId);
    const reportBuilder = this.reportRepository
      .createQueryBuilder('report')
      .innerJoinAndSelect('report.reportPeriod', 'period')
      .where('report.enterprise_id = :enterpriseId', {
        enterpriseId: enterprise.id,
      })
      .orderBy('period.report_year', 'DESC')
      .addOrderBy('period.submission_start_date', 'DESC');

    const periodBuilder = this.reportPeriodRepository
      .createQueryBuilder('period')
      .where('period.report_type_code = :reportTypeCode', {
        reportTypeCode: ReportTypeCode.OCCUPATIONAL_ACCIDENT,
      })
      .andWhere('period.period_code IN (:...periodCodes)', {
        periodCodes: [ReportPeriodCode.FIRST_HALF, ReportPeriodCode.ANNUAL],
      })
      .andWhere('period.is_active = TRUE')
      .orderBy('period.report_year', 'DESC')
      .addOrderBy('period.submission_start_date', 'DESC');

    if (query.year !== undefined) {
      reportBuilder.andWhere('period.report_year = :year', {
        year: query.year,
      });
      periodBuilder.andWhere('period.report_year = :year', {
        year: query.year,
      });
    }

    const [reports, periods] = await Promise.all([
      reportBuilder.getMany(),
      periodBuilder.getMany(),
    ]);
    const reportsByPeriod = new Map(
      reports.map((report) => [report.reportPeriodId, report]),
    );
    const items = periods.map((period): OccupationalAccidentReportListItem => {
      const report = reportsByPeriod.get(period.id);
      reportsByPeriod.delete(period.id);
      return {
        id: report?.id ?? null,
        enterpriseId: enterprise.id,
        reportPeriodId: period.id,
        reportName: period.reportName,
        reportYear: period.reportYear,
        periodCode: period.periodCode,
        submissionStartDate: period.submissionStartDate,
        submissionEndDate: period.submissionEndDate,
        isSubmissionOpen: this.isPeriodOpen(period),
        status:
          report?.status ?? OccupationalAccidentReportListStatus.NOT_STARTED,
        noAccidentsDeclared: report?.noAccidentsDeclared ?? false,
        submittedAt: report?.submittedAt ?? null,
        receivedAt: report?.receivedAt ?? null,
        updatedAt: report?.updatedAt ?? period.updatedAt,
      };
    });

    for (const report of reportsByPeriod.values()) {
      items.push({
        id: report.id,
        enterpriseId: report.enterpriseId,
        reportPeriodId: report.reportPeriodId,
        reportName: report.reportPeriod.reportName,
        reportYear: report.reportPeriod.reportYear,
        periodCode: report.reportPeriod.periodCode,
        submissionStartDate: report.reportPeriod.submissionStartDate,
        submissionEndDate: report.reportPeriod.submissionEndDate,
        isSubmissionOpen: this.isPeriodOpen(report.reportPeriod),
        status: report.status,
        noAccidentsDeclared: report.noAccidentsDeclared,
        submittedAt: report.submittedAt,
        receivedAt: report.receivedAt,
        updatedAt: report.updatedAt,
      });
    }

    return items.sort(
      (left, right) =>
        right.reportYear - left.reportYear ||
        right.submissionStartDate.localeCompare(left.submissionStartDate),
    );
  }

  async getAdminReports(
    query: AdminOccupationalAccidentReportQueryDto = new AdminOccupationalAccidentReportQueryDto(),
  ): Promise<AdminOccupationalAccidentReportPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const builder = this.reportRepository
      .createQueryBuilder('report')
      .innerJoinAndSelect('report.reportPeriod', 'period')
      .where('report.status != :draftStatus', {
        draftStatus: OccupationalAccidentReportStatus.DRAFT,
      });

    const search = query.search?.trim().toLowerCase();
    if (search) {
      builder.andWhere(
        '(LOWER(report.enterprise_name) LIKE :search OR LOWER(report.tax_code) LIKE :search)',
        { search: `%${search}%` },
      );
    }
    const enterpriseName = query.enterpriseName?.trim().toLowerCase();
    if (enterpriseName) {
      builder.andWhere('LOWER(report.enterprise_name) LIKE :enterpriseName', {
        enterpriseName: `%${enterpriseName}%`,
      });
    }
    const taxCode = query.taxCode?.trim();
    if (taxCode) {
      builder.andWhere('report.tax_code LIKE :taxCode', {
        taxCode: `%${taxCode}%`,
      });
    }
    if (query.year !== undefined) {
      builder.andWhere('period.report_year = :year', { year: query.year });
    }
    if (query.reportPeriodId !== undefined) {
      builder.andWhere('report.report_period_id = :reportPeriodId', {
        reportPeriodId: query.reportPeriodId,
      });
    }
    if (query.status !== undefined) {
      builder.andWhere('report.status = :status', { status: query.status });
    }
    this.applyEnterpriseLocationFilter(builder, query);

    builder
      .orderBy('report.submitted_at', 'DESC', 'NULLS LAST')
      .addOrderBy('report.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [reports, total] = await builder.getManyAndCount();
    return {
      data: reports.map((report) => ({
        id: report.id,
        enterpriseId: report.enterpriseId,
        enterpriseName: report.enterpriseName,
        taxCode: report.taxCode,
        reportPeriodId: report.reportPeriodId,
        reportName: report.reportPeriod.reportName,
        reportYear: report.reportPeriod.reportYear,
        periodCode: report.reportPeriod.periodCode,
        submissionStartDate: report.reportPeriod.submissionStartDate,
        submissionEndDate: report.reportPeriod.submissionEndDate,
        status: report.status,
        noAccidentsDeclared: report.noAccidentsDeclared,
        submittedAt: report.submittedAt,
        receivedAt: report.receivedAt,
        returnedAt: report.returnedAt,
        updatedAt: report.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  // Lọc theo địa bàn trụ sở chính hiện tại của doanh nghiệp
  private applyEnterpriseLocationFilter(
    builder: SelectQueryBuilder<OccupationalAccidentReportEntity>,
    query: Pick<AdminOccupationalAccidentReportQueryDto, 'provinceId' | 'wardId'>,
  ) {
    if (query.provinceId === undefined && query.wardId === undefined) return;
    builder.innerJoin('report.enterprise', 'enterprise');
    if (query.provinceId !== undefined) {
      builder.andWhere('enterprise.province_id = :provinceId', {
        provinceId: query.provinceId,
      });
    }
    if (query.wardId !== undefined) {
      builder.andWhere('enterprise.ward_id = :wardId', { wardId: query.wardId });
    }
  }

  async getAdminSummary(
    query: AdminOccupationalAccidentReportQueryDto = new AdminOccupationalAccidentReportQueryDto(),
  ): Promise<AdminOccupationalAccidentSummary> {
    const builder = this.reportRepository
      .createQueryBuilder('report')
      .innerJoinAndSelect('report.reportPeriod', 'period')
      .leftJoinAndSelect('report.cases', 'accidentCase')
      .leftJoinAndSelect('accidentCase.primaryCause', 'primaryCause')
      .leftJoinAndSelect('accidentCase.injuryFactor', 'injuryFactor')
      .leftJoinAndSelect('accidentCase.victimGroups', 'victimGroup')
      .leftJoinAndSelect('victimGroup.occupation', 'occupation')
      .leftJoinAndSelect('report.article39Summary', 'article39Summary')
      .where('report.status = :receivedStatus', {
        receivedStatus: OccupationalAccidentReportStatus.RECEIVED,
      });

    if (query.year !== undefined) {
      builder.andWhere('period.report_year = :year', { year: query.year });
    }
    if (query.reportPeriodId !== undefined) {
      builder.andWhere('report.report_period_id = :reportPeriodId', {
        reportPeriodId: query.reportPeriodId,
      });
    }
    this.applyEnterpriseLocationFilter(builder, query);

    const [reports, causes, registeredEnterprises] = await Promise.all([
      builder
        .orderBy('report.enterprise_name', 'ASC')
        .addOrderBy('report.id', 'ASC')
        .getMany(),
      this.getActiveAccidentCauses(),
      this.enterpriseRepository.find({
        where: {
          isActive: true,
          ...(query.provinceId !== undefined && { provinceId: query.provinceId }),
          ...(query.wardId !== undefined && { wardId: query.wardId }),
        },
        relations: { businessType: true },
      }),
    ]);
    const regular = this.emptySummary();
    const article39 = this.emptySummary();
    const grandTotal = this.emptySummary();
    const byCause = this.createCauseBreakdownMap(causes);
    const byInjuryFactor = new Map<number, BreakdownValue>();
    const byOccupation = new Map<number, BreakdownValue>();
    const byIndustry = new Map<string, BreakdownValue>();
    const registeredEnterpriseIds = new Set<number>();
    const enterpriseIds = new Set<number>();
    const businessTypes = new Map<
      string,
      {
        code: string;
        name: string;
        totalEnterpriseIds: Set<number>;
        enterpriseIds: Set<number>;
        totalEmployees: number;
        femaleEmployees: number;
        payrollFundVnd: string;
        accidentSummary: AccidentSummary;
      }
    >();
    let totalEmployees = 0;
    let femaleEmployees = 0;
    let payrollFundVnd = '0';

    const getBusinessTypeSummary = (code: string, name: string) => {
      const current = businessTypes.get(code) ?? {
        code,
        name,
        totalEnterpriseIds: new Set<number>(),
        enterpriseIds: new Set<number>(),
        totalEmployees: 0,
        femaleEmployees: 0,
        payrollFundVnd: '0',
        accidentSummary: this.emptySummary(),
      };
      businessTypes.set(code, current);
      return current;
    };

    for (const enterprise of registeredEnterprises) {
      if (!enterprise.businessType) continue;
      registeredEnterpriseIds.add(enterprise.id);
      getBusinessTypeSummary(
        enterprise.businessType.typeCode,
        enterprise.businessType.typeName,
      ).totalEnterpriseIds.add(enterprise.id);
    }

    const mergeBreakdownRows = (
      target: Map<number, BreakdownValue>,
      rows: AccidentBreakdownRow[],
    ) => {
      for (const row of rows) {
        const current = target.get(row.id) ?? {
          id: row.id,
          code: row.code,
          name: row.name,
          ...this.emptySummary(),
        };
        this.addSummary(current, row);
        target.set(row.id, current);
      }
    };

    for (const report of reports) {
      report.cases ??= [];
      for (const accidentCase of report.cases) {
        accidentCase.victimGroups ??= [];
      }
      const overview = this.buildOverview(report, causes);
      registeredEnterpriseIds.add(report.enterpriseId);
      enterpriseIds.add(report.enterpriseId);
      totalEmployees += report.totalEmployees;
      femaleEmployees += report.femaleEmployees;
      payrollFundVnd = this.sumMoney(payrollFundVnd, report.payrollFundVnd);
      this.addSummary(regular, overview.regular);
      this.addSummary(article39, overview.article39);
      this.addSummary(grandTotal, overview.grandTotal);
      mergeBreakdownRows(byCause, overview.byCause);
      mergeBreakdownRows(byInjuryFactor, overview.byInjuryFactor);
      mergeBreakdownRows(byOccupation, overview.byOccupation);

      const industry = byIndustry.get(report.industryCode) ?? {
        id: Number.parseInt(report.industryCode, 10),
        code: report.industryCode,
        name: report.industryName,
        ...this.emptySummary(),
      };
      this.addSummary(industry, overview.grandTotal);
      byIndustry.set(report.industryCode, industry);

      const businessType = getBusinessTypeSummary(
        report.businessTypeCode,
        report.businessTypeName,
      );
      businessType.totalEnterpriseIds.add(report.enterpriseId);
      businessType.enterpriseIds.add(report.enterpriseId);
      businessType.totalEmployees += report.totalEmployees;
      businessType.femaleEmployees += report.femaleEmployees;
      businessType.payrollFundVnd = this.sumMoney(
        businessType.payrollFundVnd,
        report.payrollFundVnd,
      );
      this.addSummary(businessType.accidentSummary, overview.grandTotal);
      businessTypes.set(report.businessTypeCode, businessType);
    }

    const sortRows = <Key>(rows: Map<Key, BreakdownValue>) =>
      [...rows.values()].sort((left, right) =>
        left.code.localeCompare(right.code, 'vi', { numeric: true }),
      );

    return {
      reportCount: reports.length,
      registeredEnterpriseCount: registeredEnterpriseIds.size,
      enterpriseCount: enterpriseIds.size,
      totalEmployees,
      femaleEmployees,
      payrollFundVnd,
      ...this.calculateFrequencyMetrics(grandTotal, totalEmployees),
      overview: {
        regular,
        article39,
        grandTotal,
        byCause: sortRows(byCause),
        byInjuryFactor: sortRows(byInjuryFactor),
        byOccupation: sortRows(byOccupation),
      },
      byIndustry: sortRows(byIndustry),
      byBusinessType: [...businessTypes.values()]
        .sort((left, right) => left.name.localeCompare(right.name, 'vi'))
        .map((row) => ({
          code: row.code,
          name: row.name,
          totalEnterpriseCount: row.totalEnterpriseIds.size,
          enterpriseCount: row.enterpriseIds.size,
          totalEmployees: row.totalEmployees,
          femaleEmployees: row.femaleEmployees,
          payrollFundVnd: row.payrollFundVnd,
          accidentSummary: row.accidentSummary,
          ...this.calculateFrequencyMetrics(
            row.accidentSummary,
            row.totalEmployees,
          ),
        })),
    };
  }

  private calculateFrequencyMetrics(
    counts: Pick<AccidentCountMetrics, 'victimCount' | 'deathCount'>,
    totalEmployees: number,
  ): AccidentFrequencyMetrics {
    if (totalEmployees <= 0) {
      return {
        accidentFrequencyPerThousand: 0,
        fatalityFrequencyPerThousand: 0,
      };
    }
    return {
      accidentFrequencyPerThousand:
        (counts.victimCount * 1_000) / totalEmployees,
      fatalityFrequencyPerThousand:
        (counts.deathCount * 1_000) / totalEmployees,
    };
  }

  async getAdminReport(reportId: number): Promise<any> {
    const report = await this.findAdminReport(reportId);
    return {
      ...this.toResponse(report),
      history: [...(report.histories ?? [])]
        .sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        )
        .map((row) => ({
          id: row.id,
          fromStatus: row.fromStatus,
          toStatus: row.toStatus,
          reason: row.reason,
          performedBy: row.createdBy,
          performedAt: row.createdAt,
        })),
    };
  }

  async getAdminOverview(
    reportId: number,
  ): Promise<OccupationalAccidentOverview> {
    const [report, causes] = await Promise.all([
      this.findAdminReport(reportId),
      this.getActiveAccidentCauses(),
    ]);
    return this.buildOverview(report, causes);
  }

  async receiveReport(userId: number, reportId: number): Promise<any> {
    return this.transitionSubmittedReport(
      userId,
      reportId,
      OccupationalAccidentReportStatus.RECEIVED,
      null,
    );
  }

  async returnReport(
    userId: number,
    reportId: number,
    reason: string,
  ): Promise<any> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10 || normalizedReason.length > 1000) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Lý do trả lại phải có từ 10 đến 1000 ký tự.',
      });
    }
    return this.transitionSubmittedReport(
      userId,
      reportId,
      OccupationalAccidentReportStatus.RETURNED,
      normalizedReason,
    );
  }

  async createDraft(
    userId: number,
    dto: CreateOccupationalAccidentReportDto,
  ): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const period = await this.findOccupationalAccidentPeriod(
      dto.reportPeriodId,
    );

    const existing = await this.reportRepository.findOne({
      where: {
        enterpriseId: enterprise.id,
        reportPeriodId: period.id,
      },
    });
    if (existing) return this.getMyReport(userId, existing.id);

    this.assertPeriodOpen(period);

    let reportId: number;
    try {
      reportId = await this.dataSource.transaction(async (manager) => {
        const reportRepository = manager.getRepository(
          OccupationalAccidentReportEntity,
        );
        const historyRepository = manager.getRepository(
          OccupationalAccidentReportHistoryEntity,
        );
        const report = reportRepository.create({
          enterpriseId: enterprise.id,
          reportPeriodId: period.id,
          status: OccupationalAccidentReportStatus.DRAFT,
          enterpriseName: enterprise.enterpriseName,
          taxCode: enterprise.taxCode,
          enterpriseAddress: enterprise.address,
          businessTypeCode: enterprise.businessType.typeCode,
          businessTypeName: enterprise.businessType.typeName,
          industryCode: enterprise.industry.industryCode,
          industryName: enterprise.industry.industryName,
          totalEmployees: 0,
          femaleEmployees: 0,
          payrollFundVnd: '0',
          noAccidentsDeclared: false,
          createdBy: userId,
          updatedBy: userId,
        });
        const saved = await reportRepository.save(report);
        await manager
          .getRepository(OccupationalAccidentArticle39SummaryEntity)
          .save({
            reportId: saved.id,
            createdBy: userId,
            updatedBy: userId,
          });
        await historyRepository.save(
          historyRepository.create({
            reportId: saved.id,
            fromStatus: null,
            toStatus: OccupationalAccidentReportStatus.DRAFT,
            reason: null,
            createdBy: userId,
          }),
        );
        return saved.id;
      });
    } catch (error) {
      const databaseCode =
        error instanceof QueryFailedError
          ? (error.driverError as { code?: string } | undefined)?.code
          : undefined;
      if (databaseCode === '23505') {
        const concurrentDraft = await this.reportRepository.findOne({
          where: {
            enterpriseId: enterprise.id,
            reportPeriodId: period.id,
          },
        });
        if (concurrentDraft) {
          return this.getMyReport(userId, concurrentDraft.id);
        }
      }
      throw error;
    }

    return this.getMyReport(userId, reportId);
  }

  async getMyReport(userId: number, reportId: number): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    return this.toResponse(report);
  }

  async uploadSignedDocument(
    userId: number,
    reportId: number,
    file: MultipartFile | undefined,
  ): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    if (
      !file ||
      file.mimetype !== 'application/pdf' ||
      !file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE,
        message: 'Bản báo cáo đã ký phải là tệp PDF.',
      });
    }

    const uploaded = await this.fileService.upload(
      file,
      'enterprise-files',
      enterprise.id,
    );
    const previousObjectKey = report.draftDocument?.documentObjectKey;
    try {
      await this.draftDocumentRepository.save({
        reportId: report.id,
        documentObjectKey: uploaded.objectKey,
        documentOriginalName: uploaded.originalName,
        documentContentType: uploaded.contentType,
        documentSize: String(uploaded.size),
        documentSha256: createHash('sha256').update(file.buffer).digest('hex'),
        uploadedBy: userId,
        uploadedAt: uploaded.uploadedAt,
      });
    } catch (error) {
      await this.fileService.deleteEnterpriseFile(uploaded.objectKey);
      throw error;
    }

    if (previousObjectKey && previousObjectKey !== uploaded.objectKey) {
      await this.fileService.deleteEnterpriseFile(previousObjectKey);
    }
    return this.getMyReport(userId, reportId);
  }

  async removeSignedDocument(userId: number, reportId: number): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    const objectKey = report.draftDocument?.documentObjectKey;
    await this.draftDocumentRepository.delete(report.id);
    await this.deleteSignedDocumentFile(objectKey);
    return this.getMyReport(userId, reportId);
  }

  async getMySignedDocumentAccess(userId: number, reportId: number) {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    return this.getSignedDocumentAccess(report, true);
  }

  async getAdminSignedDocumentAccess(reportId: number) {
    return this.getSignedDocumentAccess(
      await this.findAdminReport(reportId),
      false,
    );
  }

  async updateHeader(
    userId: number,
    reportId: number,
    dto: UpdateReportHeaderDto,
  ): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    this.assertMoneyFitsDatabase(dto.payrollFundVnd);

    if (dto.femaleEmployees > dto.totalEmployees) {
      this.throwInvalidMetrics(
        'Số lao động nữ không được lớn hơn tổng số lao động.',
      );
    }
    for (const accidentCase of report.cases ?? []) {
      this.validateManagedVictimsAgainstWorkforce(
        accidentCase.victimGroups,
        dto.totalEmployees,
        dto.femaleEmployees,
      );
    }
    if (
      dto.noAccidentsDeclared &&
      (report.cases.length > 0 || this.hasArticle39Data(report))
    ) {
      this.throwInvalidMetrics(
        'Không thể xác nhận không phát sinh tai nạn khi báo cáo đã có số liệu tai nạn.',
      );
    }

    await this.reportRepository.update(report.id, {
      totalEmployees: dto.totalEmployees,
      femaleEmployees: dto.femaleEmployees,
      payrollFundVnd: dto.payrollFundVnd,
      noAccidentsDeclared: dto.noAccidentsDeclared,
      updatedBy: userId,
    });
    await this.invalidateDraftDocument(report);
    return this.getMyReport(userId, reportId);
  }

  async createCase(
    userId: number,
    reportId: number,
    dto: SaveAccidentCaseDto,
  ): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    if (report.noAccidentsDeclared) {
      this.throwInvalidMetrics(
        'Bỏ xác nhận không phát sinh tai nạn trước khi thêm vụ tai nạn.',
      );
    }
    await this.validateCase(dto, report);

    const caseId = await this.dataSource.transaction(async (manager) => {
      const caseRepository = manager.getRepository(
        OccupationalAccidentCaseEntity,
      );
      const groupRepository = manager.getRepository(
        OccupationalAccidentVictimGroupEntity,
      );
      const accidentCase = await caseRepository.save(
        caseRepository.create({
          reportId: report.id,
          accidentDate: dto.accidentDate,
          primaryCauseId: dto.primaryCauseId,
          injuryFactorId: dto.injuryFactorId,
          medicalCostVnd: dto.medicalCostVnd,
          salaryCostVnd: dto.salaryCostVnd,
          compensationCostVnd: dto.compensationCostVnd,
          lostWorkDays: dto.lostWorkDays,
          propertyDamageVnd: dto.propertyDamageVnd,
          createdBy: userId,
          updatedBy: userId,
        }),
      );
      await groupRepository.save(
        dto.victimGroups.map((group) =>
          groupRepository.create({
            ...group,
            accidentCaseId: accidentCase.id,
            createdBy: userId,
            updatedBy: userId,
          }),
        ),
      );
      await manager
        .getRepository(OccupationalAccidentReportEntity)
        .update(report.id, {
          updatedBy: userId,
        });
      return accidentCase.id;
    });

    await this.invalidateDraftDocument(report);

    return this.getOwnedCaseResponse(userId, reportId, caseId);
  }

  async updateCase(
    userId: number,
    reportId: number,
    caseId: number,
    dto: SaveAccidentCaseDto,
  ): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    await this.findCaseOrFail(report.id, caseId);
    await this.validateCase(dto, report);

    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(OccupationalAccidentCaseEntity)
        .update(caseId, {
          accidentDate: dto.accidentDate,
          primaryCauseId: dto.primaryCauseId,
          injuryFactorId: dto.injuryFactorId,
          medicalCostVnd: dto.medicalCostVnd,
          salaryCostVnd: dto.salaryCostVnd,
          compensationCostVnd: dto.compensationCostVnd,
          lostWorkDays: dto.lostWorkDays,
          propertyDamageVnd: dto.propertyDamageVnd,
          updatedBy: userId,
        });
      const groupRepository = manager.getRepository(
        OccupationalAccidentVictimGroupEntity,
      );
      await groupRepository.delete({ accidentCaseId: caseId });
      await groupRepository.save(
        dto.victimGroups.map((group) =>
          groupRepository.create({
            ...group,
            accidentCaseId: caseId,
            createdBy: userId,
            updatedBy: userId,
          }),
        ),
      );
      await manager
        .getRepository(OccupationalAccidentReportEntity)
        .update(report.id, {
          updatedBy: userId,
        });
    });

    await this.invalidateDraftDocument(report);

    return this.getOwnedCaseResponse(userId, reportId, caseId);
  }

  async removeCase(
    userId: number,
    reportId: number,
    caseId: number,
  ): Promise<void> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    await this.findCaseOrFail(report.id, caseId);

    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(OccupationalAccidentCaseEntity)
        .delete(caseId);
      await manager
        .getRepository(OccupationalAccidentReportEntity)
        .update(report.id, {
          updatedBy: userId,
        });
    });
    await this.invalidateDraftDocument(report);
  }

  async updateArticle39Summary(
    userId: number,
    reportId: number,
    dto: UpdateArticle39SummaryDto,
  ): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    this.validateArticle39(dto);
    if (report.noAccidentsDeclared && this.hasArticle39DtoData(dto)) {
      this.throwInvalidMetrics(
        'Bỏ xác nhận không phát sinh tai nạn trước khi nhập số liệu Khoản 2 Điều 39.',
      );
    }

    await this.article39Repository.save({
      reportId: report.id,
      ...dto,
      createdBy: report.article39Summary?.createdBy ?? userId,
      updatedBy: userId,
    });
    await this.invalidateDraftDocument(report);
    return this.getMyReport(userId, reportId);
  }

  async getOverview(
    userId: number,
    reportId: number,
  ): Promise<OccupationalAccidentOverview> {
    const enterprise = await this.resolveEnterprise(userId);
    const [report, causes] = await Promise.all([
      this.findOwnedReport(enterprise.id, reportId),
      this.getActiveAccidentCauses(),
    ]);
    return this.buildOverview(report, causes);
  }

  async submit(userId: number, reportId: number): Promise<any> {
    const enterprise = await this.resolveEnterprise(userId);
    const report = await this.findOwnedReport(enterprise.id, reportId);
    this.assertEditable(report);
    if (report.totalEmployees <= 0) {
      throw new BadRequestException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_INCOMPLETE,
        message:
          'Vui lòng hoàn thành thông tin lao động và quỹ lương trước khi gửi báo cáo.',
      });
    }
    for (const accidentCase of report.cases) {
      this.validateManagedVictimsAgainstWorkforce(
        accidentCase.victimGroups,
        report.totalEmployees,
        report.femaleEmployees,
      );
    }
    const hasAccidentData =
      report.cases.length > 0 || (report.article39Summary?.totalCases ?? 0) > 0;
    if (!report.noAccidentsDeclared && !hasAccidentData) {
      throw new BadRequestException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_INCOMPLETE,
        message:
          'Báo cáo chưa có vụ tai nạn và chưa xác nhận không phát sinh tai nạn.',
      });
    }
    const document = report.draftDocument;
    if (!document) {
      throw new BadRequestException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_DOCUMENT_REQUIRED,
        message:
          'Vui lòng tải lên bản báo cáo PDF đã ký, đóng dấu trước khi gửi.',
      });
    }

    const submittedAt = new Date();
    await this.dataSource.transaction(async (manager) => {
      const updateResult = await manager.update(
        OccupationalAccidentReportEntity,
        {
          id: report.id,
          status: In([
            OccupationalAccidentReportStatus.DRAFT,
            OccupationalAccidentReportStatus.RETURNED,
          ]),
        },
        {
          status: OccupationalAccidentReportStatus.SUBMITTED,
          submittedAt,
          receivedAt: null,
          returnedAt: null,
          returnedReason: null,
          updatedBy: userId,
        },
      );
      if (updateResult.affected !== 1) {
        throw new ConflictException({
          code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_INVALID_STATUS,
          message: 'Báo cáo đã được xử lý. Vui lòng tải lại dữ liệu.',
        });
      }

      const submissionRepository = manager.getRepository(
        OccupationalAccidentReportSubmissionEntity,
      );
      const raw = await submissionRepository
        .createQueryBuilder('submission')
        .select('COALESCE(MAX(submission.submission_no), 0)', 'max')
        .where('submission.report_id = :reportId', { reportId: report.id })
        .getRawOne<{ max: string }>();
      const submission = await submissionRepository.save(
        submissionRepository.create({
          reportId: report.id,
          submissionNo: Number(raw?.max ?? 0) + 1,
          reportDate: this.getCurrentDateInVietnam(),
          submittedBy: userId,
          submittedAt,
          payloadSnapshot: this.buildSubmissionSnapshot(report, submittedAt),
          documentObjectKey: document.documentObjectKey,
          documentOriginalName: document.documentOriginalName,
          documentContentType: document.documentContentType,
          documentSize: document.documentSize,
          documentSha256: document.documentSha256,
        }),
      );
      const historyRepository = manager.getRepository(
        OccupationalAccidentReportHistoryEntity,
      );
      await historyRepository.save(
        historyRepository.create({
          reportId: report.id,
          submissionId: submission.id,
          fromStatus: report.status,
          toStatus: OccupationalAccidentReportStatus.SUBMITTED,
          reason: null,
          createdBy: userId,
        }),
      );
      await manager.delete(OccupationalAccidentReportDraftDocumentEntity, {
        reportId: report.id,
      });
    });
    return this.getMyReport(userId, reportId);
  }

  private async resolveEnterprise(userId: number): Promise<EnterpriseEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, enterpriseId: true },
    });
    if (!user?.enterpriseId) {
      throw new ForbiddenException({
        code: ErrorCode.ENTERPRISE_NOT_FOUND,
        message: 'Tài khoản không thuộc doanh nghiệp nào.',
      });
    }

    const enterprise = await this.enterpriseRepository.findOne({
      where: { id: user.enterpriseId, isActive: true },
      relations: { businessType: true, industry: true },
    });
    if (!enterprise) {
      throw new ForbiddenException({
        code: ErrorCode.ENTERPRISE_NOT_FOUND,
        message: 'Không tìm thấy doanh nghiệp đang hoạt động.',
      });
    }
    return enterprise;
  }

  private async findOccupationalAccidentPeriod(
    id: number,
  ): Promise<ReportPeriodEntity> {
    const period = await this.reportPeriodRepository.findOne({ where: { id } });
    if (!period) {
      throw new NotFoundException({
        code: ErrorCode.REPORT_PERIOD_NOT_FOUND,
        message: 'Không tìm thấy kỳ báo cáo.',
      });
    }
    if (
      period.reportTypeCode !== ReportTypeCode.OCCUPATIONAL_ACCIDENT ||
      (period.periodCode !== ReportPeriodCode.FIRST_HALF &&
        period.periodCode !== ReportPeriodCode.ANNUAL)
    ) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OCCUPATIONAL_ACCIDENT_REPORT_PERIOD,
        message: 'Kỳ được chọn không phải kỳ báo cáo tai nạn lao động.',
      });
    }
    return period;
  }

  private assertPeriodOpen(period: ReportPeriodEntity): void {
    if (!this.isPeriodOpen(period)) {
      throw new ConflictException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_PERIOD_CLOSED,
        message: 'Kỳ báo cáo chưa mở hoặc đã đóng.',
      });
    }
  }

  private isPeriodOpen(period: ReportPeriodEntity): boolean {
    const today = this.getCurrentDateInVietnam();
    return Boolean(
      period.isActive &&
      today >= period.submissionStartDate &&
      today <= period.submissionEndDate,
    );
  }

  private getCoverageDateRange(period: ReportPeriodEntity): [string, string] {
    if (period.periodCode === ReportPeriodCode.FIRST_HALF) {
      return [`${period.reportYear}-01-01`, `${period.reportYear}-06-30`];
    }
    if (period.periodCode === ReportPeriodCode.ANNUAL) {
      return [`${period.reportYear}-01-01`, `${period.reportYear}-12-31`];
    }
    throw new BadRequestException({
      code: ErrorCode.INVALID_OCCUPATIONAL_ACCIDENT_REPORT_PERIOD,
      message: 'Kỳ báo cáo tai nạn lao động không hợp lệ.',
    });
  }

  private getCurrentDateInVietnam(): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }

  private async findOwnedReport(
    enterpriseId: number,
    reportId: number,
  ): Promise<OccupationalAccidentReportEntity> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, enterpriseId },
      relations: {
        reportPeriod: true,
        article39Summary: true,
        draftDocument: true,
        submissions: true,
        cases: {
          primaryCause: true,
          injuryFactor: true,
          victimGroups: { occupation: true },
        },
      },
    });
    if (!report) {
      throw new NotFoundException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_NOT_FOUND,
        message: 'Không tìm thấy báo cáo tai nạn lao động.',
      });
    }
    report.cases ??= [];
    for (const accidentCase of report.cases) {
      accidentCase.victimGroups ??= [];
    }
    return report;
  }

  private async findAdminReport(
    reportId: number,
  ): Promise<OccupationalAccidentReportEntity> {
    const report = await this.reportRepository.findOne({
      where: {
        id: reportId,
        status: Not(OccupationalAccidentReportStatus.DRAFT),
      },
      relations: {
        reportPeriod: true,
        histories: true,
        article39Summary: true,
        draftDocument: true,
        submissions: true,
        cases: {
          primaryCause: true,
          injuryFactor: true,
          victimGroups: { occupation: true },
        },
      },
    });
    if (!report) {
      throw new NotFoundException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_NOT_FOUND,
        message: 'Không tìm thấy báo cáo đã gửi.',
      });
    }
    report.cases ??= [];
    report.histories ??= [];
    for (const accidentCase of report.cases) {
      accidentCase.victimGroups ??= [];
    }
    return report;
  }

  private async transitionSubmittedReport(
    userId: number,
    reportId: number,
    toStatus:
      | typeof OccupationalAccidentReportStatus.RECEIVED
      | typeof OccupationalAccidentReportStatus.RETURNED,
    reason: string | null,
  ): Promise<any> {
    const report = await this.findAdminReport(reportId);
    if (report.status !== OccupationalAccidentReportStatus.SUBMITTED) {
      throw new ConflictException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_INVALID_STATUS,
        message:
          'Chỉ báo cáo đang ở trạng thái Đã gửi mới được tiếp nhận hoặc trả lại.',
      });
    }
    if (
      toStatus === OccupationalAccidentReportStatus.RECEIVED &&
      !this.latestSubmission(report)
    ) {
      throw new BadRequestException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_DOCUMENT_REQUIRED,
        message: 'Không thể tiếp nhận báo cáo chưa có bản PDF ký, đóng dấu.',
      });
    }

    const actionAt = new Date();
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.update(
        OccupationalAccidentReportEntity,
        {
          id: report.id,
          status: OccupationalAccidentReportStatus.SUBMITTED,
        },
        toStatus === OccupationalAccidentReportStatus.RECEIVED
          ? {
              status: toStatus,
              receivedAt: actionAt,
              returnedAt: null,
              returnedReason: null,
              updatedBy: userId,
            }
          : {
              status: toStatus,
              receivedAt: null,
              returnedAt: actionAt,
              returnedReason: reason,
              updatedBy: userId,
            },
      );
      if (result.affected !== 1) {
        throw new ConflictException({
          code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_INVALID_STATUS,
          message:
            'Báo cáo đã được người khác xử lý. Vui lòng tải lại dữ liệu.',
        });
      }

      const historyRepository = manager.getRepository(
        OccupationalAccidentReportHistoryEntity,
      );
      await historyRepository.save(
        historyRepository.create({
          reportId: report.id,
          submissionId: this.latestSubmission(report)?.id ?? null,
          fromStatus: OccupationalAccidentReportStatus.SUBMITTED,
          toStatus,
          reason,
          createdBy: userId,
        }),
      );
    });

    return this.getAdminReport(reportId);
  }

  private assertEditable(report: OccupationalAccidentReportEntity): void {
    if (
      report.status !== OccupationalAccidentReportStatus.DRAFT &&
      report.status !== OccupationalAccidentReportStatus.RETURNED
    ) {
      throw new ConflictException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_READ_ONLY,
        message: 'Báo cáo đã gửi hoặc đã tiếp nhận nên không thể chỉnh sửa.',
      });
    }
    this.assertPeriodOpen(report.reportPeriod);
  }

  private async validateCase(
    dto: SaveAccidentCaseDto,
    report: OccupationalAccidentReportEntity,
  ): Promise<void> {
    this.assertMoneyFitsDatabase(
      dto.medicalCostVnd,
      dto.salaryCostVnd,
      dto.compensationCostVnd,
      dto.propertyDamageVnd,
    );
    const [coverageStart, coverageEnd] = this.getCoverageDateRange(
      report.reportPeriod,
    );
    if (dto.accidentDate < coverageStart || dto.accidentDate > coverageEnd) {
      this.throwInvalidMetrics('Ngày xảy ra tai nạn không thuộc kỳ báo cáo.');
    }

    const [cause, factor] = await Promise.all([
      this.causeRepository.findOne({
        where: { id: dto.primaryCauseId, isActive: true },
      }),
      this.injuryFactorRepository.findOne({
        where: { id: dto.injuryFactorId, isActive: true },
      }),
    ]);
    if (!cause) {
      throw new BadRequestException({
        code: ErrorCode.ACCIDENT_CAUSE_NOT_FOUND,
        message: 'Nguyên nhân tai nạn không tồn tại hoặc đã ngừng sử dụng.',
      });
    }
    if (!factor) {
      throw new BadRequestException({
        code: ErrorCode.INJURY_FACTOR_NOT_FOUND,
        message: 'Yếu tố gây chấn thương không tồn tại hoặc đã ngừng sử dụng.',
      });
    }

    const occupationIds = [
      ...new Set(dto.victimGroups.map((row) => row.occupationId)),
    ];
    const occupations = await this.occupationRepository.find({
      where: { id: In(occupationIds), level: 4, isActive: true },
    });
    if (occupations.length !== occupationIds.length) {
      throw new BadRequestException({
        code: ErrorCode.OCCUPATION_NOT_FOUND,
        message: 'Nghề nghiệp phải là nghề cấp 4 đang hoạt động.',
      });
    }

    const uniqueGroups = new Set<string>();
    for (const group of dto.victimGroups) {
      this.validateVictimGroup(group);
      const key = `${group.occupationId}:${group.isUnderEnterpriseManagement}`;
      if (uniqueGroups.has(key)) {
        this.throwInvalidMetrics(
          'Không được lặp nghề nghiệp và phạm vi quản lý trong cùng một vụ tai nạn.',
        );
      }
      uniqueGroups.add(key);
    }
    this.validateManagedVictimsAgainstWorkforce(
      dto.victimGroups,
      report.totalEmployees,
      report.femaleEmployees,
    );
  }

  private validateManagedVictimsAgainstWorkforce(
    groups: ReadonlyArray<{
      isUnderEnterpriseManagement: boolean;
      victimCount: number;
      femaleCount: number;
    }>,
    totalEmployees: number,
    femaleEmployees: number,
  ): void {
    const managed = groups.reduce(
      (totals, group) => {
        if (group.isUnderEnterpriseManagement) {
          totals.victimCount += group.victimCount;
          totals.femaleCount += group.femaleCount;
        }
        return totals;
      },
      { victimCount: 0, femaleCount: 0 },
    );
    if (managed.victimCount > totalEmployees) {
      this.throwInvalidMetrics(
        'Số nạn nhân thuộc quyền quản lý trong một vụ không được lớn hơn tổng số lao động của cơ sở.',
      );
    }
    if (managed.femaleCount > femaleEmployees) {
      this.throwInvalidMetrics(
        'Số lao động nữ bị nạn thuộc quyền quản lý trong một vụ không được lớn hơn tổng số lao động nữ của cơ sở.',
      );
    }
  }

  private validateVictimGroup(group: AccidentVictimGroupDto): void {
    if (group.femaleCount > group.victimCount) {
      this.throwInvalidMetrics('Số nạn nhân nữ vượt quá tổng số nạn nhân.');
    }
    if (group.deathCount + group.severeCount > group.victimCount) {
      this.throwInvalidMetrics(
        'Tổng số người chết và bị thương nặng vượt quá số nạn nhân.',
      );
    }
  }

  private validateArticle39(dto: UpdateArticle39SummaryDto): void {
    this.assertMoneyFitsDatabase(
      dto.medicalCostVnd,
      dto.salaryCostVnd,
      dto.compensationCostVnd,
      dto.propertyDamageVnd,
    );
    if (
      dto.fatalCases > dto.totalCases ||
      dto.multiVictimCases > dto.totalCases ||
      dto.totalCases > dto.victimCount ||
      dto.fatalCases > dto.deathCount ||
      dto.femaleCount > dto.victimCount ||
      dto.deathCount + dto.severeCount > dto.victimCount ||
      dto.unmanagedVictimCount > dto.victimCount ||
      dto.unmanagedFemaleCount > dto.femaleCount ||
      dto.unmanagedDeathCount > dto.deathCount ||
      dto.unmanagedSevereCount > dto.severeCount ||
      // Khớp CHECK chk_oa_article39_counts – thiếu 2 điều kiện này thì DB từ chối và API trả 500
      dto.unmanagedFemaleCount > dto.unmanagedVictimCount ||
      dto.unmanagedDeathCount + dto.unmanagedSevereCount >
        dto.unmanagedVictimCount ||
      dto.victimCount < dto.totalCases + dto.multiVictimCases
    ) {
      this.throwInvalidMetrics('Số liệu Khoản 2 Điều 39 không nhất quán.');
    }
    if (
      (dto.deathCount === 0 && dto.fatalCases !== 0) ||
      (dto.deathCount > 0 && dto.fatalCases === 0)
    ) {
      this.throwInvalidMetrics(
        'Số vụ có người chết không phù hợp với số người chết.',
      );
    }
    if (dto.totalCases === 0 && this.hasArticle39DtoData(dto)) {
      this.throwInvalidMetrics(
        'Không được nhập nạn nhân hoặc thiệt hại khi tổng số vụ bằng 0.',
      );
    }
  }

  private async findCaseOrFail(
    reportId: number,
    caseId: number,
  ): Promise<OccupationalAccidentCaseEntity> {
    const accidentCase = await this.caseRepository.findOne({
      where: { id: caseId, reportId },
    });
    if (!accidentCase) {
      throw new NotFoundException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_CASE_NOT_FOUND,
        message: 'Không tìm thấy vụ tai nạn trong báo cáo.',
      });
    }
    return accidentCase;
  }

  private async getOwnedCaseResponse(
    userId: number,
    reportId: number,
    caseId: number,
  ): Promise<any> {
    const report = await this.getMyReport(userId, reportId);
    const accidentCase = report.cases.find(
      (row: { id: number }) => row.id === caseId,
    );
    if (!accidentCase) {
      throw new NotFoundException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_CASE_NOT_FOUND,
        message: 'Không tìm thấy vụ tai nạn trong báo cáo.',
      });
    }
    return accidentCase;
  }

  private toResponse(report: OccupationalAccidentReportEntity): any {
    return {
      id: report.id,
      enterpriseId: report.enterpriseId,
      reportPeriodId: report.reportPeriodId,
      status: report.status,
      enterprise: {
        enterpriseName: report.enterpriseName,
        taxCode: report.taxCode,
        address: report.enterpriseAddress,
        businessTypeCode: report.businessTypeCode,
        businessTypeName: report.businessTypeName,
        industryCode: report.industryCode,
        industryName: report.industryName,
      },
      reportPeriod: {
        reportName: report.reportPeriod.reportName,
        reportYear: report.reportPeriod.reportYear,
        reportTypeCode: report.reportPeriod.reportTypeCode,
        periodCode: report.reportPeriod.periodCode,
        submissionStartDate: report.reportPeriod.submissionStartDate,
        submissionEndDate: report.reportPeriod.submissionEndDate,
        isSubmissionOpen: this.isPeriodOpen(report.reportPeriod),
      },
      totalEmployees: report.totalEmployees,
      femaleEmployees: report.femaleEmployees,
      payrollFundVnd: report.payrollFundVnd,
      noAccidentsDeclared: report.noAccidentsDeclared,
      headerCompleted: report.totalEmployees > 0,
      signedDocument: this.documentMetadata(report),
      submissions: [...(report.submissions ?? [])]
        .sort((left, right) => right.submissionNo - left.submissionNo)
        .map((submission) => ({
          id: submission.id,
          submissionNo: submission.submissionNo,
          reportDate: submission.reportDate,
          submittedAt: submission.submittedAt,
          documentOriginalName: submission.documentOriginalName,
          documentSize: submission.documentSize,
          documentSha256: submission.documentSha256,
        })),
      article39Summary: this.article39Summary(report),
      cases: [...report.cases]
        .sort((left, right) =>
          left.accidentDate.localeCompare(right.accidentDate),
        )
        .map((row) => ({
          id: row.id,
          accidentDate: row.accidentDate,
          accidentCause: {
            id: row.primaryCause.id,
            code: row.primaryCause.causeCode,
            name: row.primaryCause.causeName,
            group: row.primaryCause.causeGroup,
          },
          injuryFactor: {
            id: row.injuryFactor.id,
            code: row.injuryFactor.factorCode,
            name: row.injuryFactor.factorName,
          },
          medicalCostVnd: row.medicalCostVnd,
          salaryCostVnd: row.salaryCostVnd,
          compensationCostVnd: row.compensationCostVnd,
          totalCostVnd: this.sumMoney(
            row.medicalCostVnd,
            row.salaryCostVnd,
            row.compensationCostVnd,
          ),
          lostWorkDays: row.lostWorkDays,
          propertyDamageVnd: row.propertyDamageVnd,
          victimGroups: [...row.victimGroups]
            .sort((left, right) =>
              left.occupation.occupationCode.localeCompare(
                right.occupation.occupationCode,
                'vi',
                { numeric: true },
              ),
            )
            .map((group) => ({
              id: group.id,
              occupation: {
                id: group.occupation.id,
                code: group.occupation.occupationCode,
                name: group.occupation.occupationName,
              },
              isUnderEnterpriseManagement: group.isUnderEnterpriseManagement,
              victimCount: group.victimCount,
              femaleCount: group.femaleCount,
              deathCount: group.deathCount,
              severeCount: group.severeCount,
            })),
        })),
      version: report.version,
      submittedAt: report.submittedAt,
      receivedAt: report.receivedAt,
      returnedAt: report.returnedAt,
      returnedReason: report.returnedReason,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private buildOverview(
    report: OccupationalAccidentReportEntity,
    causes: AccidentCauseEntity[] = [],
  ): OccupationalAccidentOverview {
    const regular = this.emptySummary();
    const byCause = this.createCauseBreakdownMap(causes);
    const byFactor = new Map<number, BreakdownValue>();
    const byOccupation = new Map<number, BreakdownValue>();

    for (const accidentCase of report.cases) {
      const caseCounts = this.countVictimGroups(accidentCase.victimGroups);
      const caseSummary: AccidentSummary = {
        ...caseCounts,
        totalCases: 1,
        fatalCases: caseCounts.deathCount > 0 ? 1 : 0,
        multiVictimCases: caseCounts.victimCount >= 2 ? 1 : 0,
        medicalCostVnd: accidentCase.medicalCostVnd,
        salaryCostVnd: accidentCase.salaryCostVnd,
        compensationCostVnd: accidentCase.compensationCostVnd,
        totalCostVnd: this.sumMoney(
          accidentCase.medicalCostVnd,
          accidentCase.salaryCostVnd,
          accidentCase.compensationCostVnd,
        ),
        lostWorkDays: accidentCase.lostWorkDays,
        propertyDamageVnd: accidentCase.propertyDamageVnd,
      };
      this.addSummary(regular, caseSummary);
      this.addBreakdown(
        byCause,
        accidentCase.primaryCause.id,
        accidentCase.primaryCause.causeCode,
        accidentCase.primaryCause.causeName,
        caseSummary,
      );
      this.addBreakdown(
        byFactor,
        accidentCase.injuryFactor.id,
        accidentCase.injuryFactor.factorCode,
        accidentCase.injuryFactor.factorName,
        caseSummary,
      );

      const occupationGroups = new Map<
        number,
        {
          code: string;
          name: string;
          groups: OccupationalAccidentVictimGroupEntity[];
        }
      >();
      for (const group of accidentCase.victimGroups) {
        const existing = occupationGroups.get(group.occupationId) ?? {
          code: group.occupation.occupationCode,
          name: group.occupation.occupationName,
          groups: [],
        };
        existing.groups.push(group);
        occupationGroups.set(group.occupationId, existing);
      }
      for (const [occupationId, value] of occupationGroups) {
        const occupationCounts = this.countVictimGroups(value.groups);
        this.addBreakdown(byOccupation, occupationId, value.code, value.name, {
          ...this.emptySummary(),
          ...occupationCounts,
          totalCases: 1,
          fatalCases: occupationCounts.deathCount > 0 ? 1 : 0,
          multiVictimCases: occupationCounts.victimCount >= 2 ? 1 : 0,
        });
      }
    }

    const article39 = this.article39Summary(report);
    const grandTotal = this.emptySummary();
    this.addSummary(grandTotal, regular);
    this.addSummary(grandTotal, article39);
    const sortRows = (map: Map<number, BreakdownValue>) =>
      [...map.values()].sort((left, right) =>
        left.code.localeCompare(right.code, 'vi', { numeric: true }),
      );

    return {
      regular,
      article39,
      grandTotal,
      byCause: sortRows(byCause),
      byInjuryFactor: sortRows(byFactor),
      byOccupation: sortRows(byOccupation),
    };
  }

  private async getActiveAccidentCauses(): Promise<AccidentCauseEntity[]> {
    return this.causeRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', causeCode: 'ASC' },
    });
  }

  private createCauseBreakdownMap(
    causes: AccidentCauseEntity[],
  ): Map<number, BreakdownValue> {
    return new Map(
      causes.map((cause) => [
        cause.id,
        {
          id: cause.id,
          code: String(cause.displayOrder),
          name: cause.causeName,
          ...this.emptySummary(),
        },
      ]),
    );
  }

  private countVictimGroups(
    groups: OccupationalAccidentVictimGroupEntity[],
  ): AccidentCountMetrics {
    const counts = this.emptyCounts();
    for (const group of groups) {
      counts.victimCount += group.victimCount;
      counts.femaleCount += group.femaleCount;
      counts.deathCount += group.deathCount;
      counts.severeCount += group.severeCount;
      if (!group.isUnderEnterpriseManagement) {
        counts.unmanagedVictimCount += group.victimCount;
        counts.unmanagedFemaleCount += group.femaleCount;
        counts.unmanagedDeathCount += group.deathCount;
        counts.unmanagedSevereCount += group.severeCount;
      }
    }
    return counts;
  }

  private addBreakdown(
    map: Map<number, BreakdownValue>,
    id: number,
    code: string,
    name: string,
    summary: AccidentSummary,
  ): void {
    const current = map.get(id) ?? { id, code, name, ...this.emptySummary() };
    this.addSummary(current, summary);
    map.set(id, current);
  }

  private article39Summary(
    report: OccupationalAccidentReportEntity,
  ): AccidentSummary {
    const summary = report.article39Summary;
    if (!summary) return this.emptySummary();
    return {
      totalCases: summary.totalCases,
      fatalCases: summary.fatalCases,
      multiVictimCases: summary.multiVictimCases,
      victimCount: summary.victimCount,
      femaleCount: summary.femaleCount,
      deathCount: summary.deathCount,
      severeCount: summary.severeCount,
      unmanagedVictimCount: summary.unmanagedVictimCount,
      unmanagedFemaleCount: summary.unmanagedFemaleCount,
      unmanagedDeathCount: summary.unmanagedDeathCount,
      unmanagedSevereCount: summary.unmanagedSevereCount,
      medicalCostVnd: summary.medicalCostVnd,
      salaryCostVnd: summary.salaryCostVnd,
      compensationCostVnd: summary.compensationCostVnd,
      totalCostVnd: this.sumMoney(
        summary.medicalCostVnd,
        summary.salaryCostVnd,
        summary.compensationCostVnd,
      ),
      lostWorkDays: summary.lostWorkDays,
      propertyDamageVnd: summary.propertyDamageVnd,
    };
  }

  private emptyCounts(): AccidentCountMetrics {
    return {
      totalCases: 0,
      fatalCases: 0,
      multiVictimCases: 0,
      victimCount: 0,
      femaleCount: 0,
      deathCount: 0,
      severeCount: 0,
      unmanagedVictimCount: 0,
      unmanagedFemaleCount: 0,
      unmanagedDeathCount: 0,
      unmanagedSevereCount: 0,
    };
  }

  private emptySummary(): AccidentSummary {
    return {
      ...this.emptyCounts(),
      medicalCostVnd: '0',
      salaryCostVnd: '0',
      compensationCostVnd: '0',
      totalCostVnd: '0',
      lostWorkDays: 0,
      propertyDamageVnd: '0',
    };
  }

  private addSummary(target: AccidentSummary, source: AccidentSummary): void {
    this.addCounts(target, source, true);
    target.medicalCostVnd = this.sumMoney(
      target.medicalCostVnd,
      source.medicalCostVnd,
    );
    target.salaryCostVnd = this.sumMoney(
      target.salaryCostVnd,
      source.salaryCostVnd,
    );
    target.compensationCostVnd = this.sumMoney(
      target.compensationCostVnd,
      source.compensationCostVnd,
    );
    target.totalCostVnd = this.sumMoney(
      target.totalCostVnd,
      source.totalCostVnd,
    );
    target.lostWorkDays += source.lostWorkDays;
    target.propertyDamageVnd = this.sumMoney(
      target.propertyDamageVnd,
      source.propertyDamageVnd,
    );
  }

  private addCounts(
    target: AccidentCountMetrics,
    source: AccidentCountMetrics,
    includeCases: boolean,
  ): void {
    if (includeCases) {
      target.totalCases += source.totalCases;
      target.fatalCases += source.fatalCases;
      target.multiVictimCases += source.multiVictimCases;
    }
    target.victimCount += source.victimCount;
    target.femaleCount += source.femaleCount;
    target.deathCount += source.deathCount;
    target.severeCount += source.severeCount;
    target.unmanagedVictimCount += source.unmanagedVictimCount;
    target.unmanagedFemaleCount += source.unmanagedFemaleCount;
    target.unmanagedDeathCount += source.unmanagedDeathCount;
    target.unmanagedSevereCount += source.unmanagedSevereCount;
  }

  private hasArticle39Data(report: OccupationalAccidentReportEntity): boolean {
    const summary = report.article39Summary;
    if (!summary) return false;
    return (
      summary.totalCases > 0 ||
      summary.victimCount > 0 ||
      summary.medicalCostVnd !== '0' ||
      summary.salaryCostVnd !== '0' ||
      summary.compensationCostVnd !== '0' ||
      summary.lostWorkDays > 0 ||
      summary.propertyDamageVnd !== '0'
    );
  }

  private hasArticle39DtoData(dto: UpdateArticle39SummaryDto): boolean {
    return (
      dto.totalCases > 0 ||
      dto.victimCount > 0 ||
      dto.medicalCostVnd !== '0' ||
      dto.salaryCostVnd !== '0' ||
      dto.compensationCostVnd !== '0' ||
      dto.lostWorkDays > 0 ||
      dto.propertyDamageVnd !== '0'
    );
  }

  private sumMoney(...values: string[]): string {
    return values.reduce((sum, value) => sum + BigInt(value), 0n).toString();
  }

  private async invalidateDraftDocument(
    report: OccupationalAccidentReportEntity,
  ): Promise<void> {
    const objectKey = report.draftDocument?.documentObjectKey;
    if (!objectKey) return;
    await this.draftDocumentRepository.delete(report.id);
    await this.deleteSignedDocumentFile(objectKey);
    report.draftDocument = null;
  }

  private latestSubmission(
    report: OccupationalAccidentReportEntity,
  ): OccupationalAccidentReportSubmissionEntity | null {
    return (
      [...(report.submissions ?? [])].sort(
        (left, right) => right.submissionNo - left.submissionNo,
      )[0] ?? null
    );
  }

  private documentMetadata(report: OccupationalAccidentReportEntity) {
    if (report.draftDocument) {
      return {
        objectKey: report.draftDocument.documentObjectKey,
        originalName: report.draftDocument.documentOriginalName,
        contentType: report.draftDocument.documentContentType,
        size: report.draftDocument.documentSize,
        uploadedAt: report.draftDocument.uploadedAt,
        submissionNo: null,
        isDraft: true,
      };
    }
    const submission = this.latestSubmission(report);
    return submission
      ? {
          objectKey: submission.documentObjectKey,
          originalName: submission.documentOriginalName,
          contentType: submission.documentContentType,
          size: submission.documentSize,
          uploadedAt: submission.submittedAt,
          submissionNo: submission.submissionNo,
          isDraft: false,
        }
      : null;
  }

  private buildSubmissionSnapshot(
    report: OccupationalAccidentReportEntity,
    submittedAt: Date,
  ): Record<string, unknown> {
    const response = this.toResponse(report) as Record<string, unknown>;
    const {
      signedDocument: _document,
      submissions: _submissions,
      ...data
    } = response;
    return {
      schemaVersion: 1,
      ...data,
      status: OccupationalAccidentReportStatus.SUBMITTED,
      submittedAt: submittedAt.toISOString(),
      receivedAt: null,
      returnedAt: null,
      returnedReason: null,
    };
  }

  private async deleteSignedDocumentFile(
    objectKey: string | null | undefined,
  ): Promise<void> {
    if (objectKey) {
      await this.fileService.deleteEnterpriseFile(objectKey);
    }
  }

  private getSignedDocumentAccess(
    report: OccupationalAccidentReportEntity,
    preferDraft: boolean,
  ) {
    const latestSubmission = this.latestSubmission(report);
    const document =
      preferDraft && report.draftDocument
        ? this.documentMetadata(report)
        : latestSubmission
          ? {
              objectKey: latestSubmission.documentObjectKey,
              originalName: latestSubmission.documentOriginalName,
              contentType: latestSubmission.documentContentType,
              size: latestSubmission.documentSize,
              uploadedAt: latestSubmission.submittedAt,
              submissionNo: latestSubmission.submissionNo,
              isDraft: false,
            }
          : null;
    if (!document) {
      throw new NotFoundException({
        code: ErrorCode.OCCUPATIONAL_ACCIDENT_REPORT_DOCUMENT_NOT_FOUND,
        message: 'Báo cáo chưa có bản PDF đã ký, đóng dấu.',
      });
    }
    return {
      ...document,
      accessUrl: this.fileService.getEnterpriseFileAccessUrl(
        document.objectKey,
      ),
    };
  }

  private assertMoneyFitsDatabase(...values: string[]): void {
    const maxBigInt = 9_223_372_036_854_775_807n;
    if (
      values.some((value) => !/^\d+$/.test(value) || BigInt(value) > maxBigInt)
    ) {
      this.throwInvalidMetrics(
        'Giá trị tiền phải là số nguyên không âm và không vượt quá giới hạn BIGINT.',
      );
    }
  }

  private throwInvalidMetrics(message: string): never {
    throw new BadRequestException({
      code: ErrorCode.INVALID_OCCUPATIONAL_ACCIDENT_REPORT_METRICS,
      message,
    });
  }
}
