import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OccupationalAccidentReportListStatus,
  OccupationalAccidentReportStatus,
} from '../occupational-accident-report.constants.js';
import { OccupationalAccidentReportService } from '../occupational-accident-report.service.js';
import { OccupationalAccidentReportSubmissionEntity } from '../entities/occupational-accident-report-submission.entity.js';
import { OccupationalAccidentCaseEntity } from '../entities/occupational-accident-case.entity.js';
import { SaveAccidentCaseDto } from '../dto/save-accident-case.dto.js';
import { QueryFailedError } from 'typeorm';

const makeQueryBuilder = (rows: unknown[]) => ({
  innerJoinAndSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  addOrderBy: vi.fn().mockReturnThis(),
  getMany: vi.fn().mockResolvedValue(rows),
});

const makeAdminQueryBuilder = (rows: unknown[], total = rows.length) => ({
  clone: vi.fn(() => ({
    andWhere: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    setParameter: vi.fn().mockReturnThis(),
    getRawOne: vi.fn().mockResolvedValue({ flagged: '2', unflagged: '1', MISSING_WORKFORCE: '2', MISSING_SIGNATURE: '1' }),
  })),
  innerJoinAndSelect: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoinAndSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  addOrderBy: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  take: vi.fn().mockReturnThis(),
  getMany: vi.fn().mockResolvedValue(rows),
  getManyAndCount: vi.fn().mockResolvedValue([rows, total]),
});

const makePeriod = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  reportName: 'Báo cáo tai nạn lao động',
  reportYear: 2026,
  reportPeriod: 'Cả năm',
  reportTypeCode: 'OCCUPATIONAL_ACCIDENT',
  periodCode: 'ANNUAL',
  submissionStartDate: '2026-01-01',
  submissionEndDate: '2026-12-31',
  isActive: true,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const makeSubmission = (overrides: Record<string, unknown> = {}) => ({
  id: 40,
  reportId: 20,
  submissionNo: 1,
  reportDate: '2026-11-09',
  submittedBy: 1,
  submittedAt: new Date('2026-11-09T00:00:00.000Z'),
  payloadSnapshot: { schemaVersion: 1 },
  documentObjectKey: 'enterprise-files/2/report.pdf',
  documentOriginalName: 'report.pdf',
  documentContentType: 'application/pdf',
  documentSize: '8',
  documentSha256: 'a'.repeat(64),
  ...overrides,
});

const makeReport = (overrides: Record<string, unknown> = {}) => ({
  id: 20,
  enterpriseId: 2,
  reportPeriodId: 10,
  reportPeriod: makePeriod(),
  enterpriseName: 'Công ty Cổ phần An Toàn',
  taxCode: '0312345678',
  enterpriseAddress: 'Thành phố Hồ Chí Minh',
  businessTypeCode: 'CTCP',
  businessTypeName: 'Công ty cổ phần',
  industryCode: '6201',
  industryName: 'Lập trình máy vi tính',
  status: OccupationalAccidentReportStatus.DRAFT,
  noAccidentsDeclared: false,
  headerCompleted: true,
  totalEmployees: 30,
  femaleEmployees: 12,
  payrollFundVnd: '100000000',
  article39Summary: {
    totalCases: 1,
    fatalCases: 0,
    multiVictimCases: 1,
    victimCount: 2,
    femaleCount: 1,
    deathCount: 0,
    severeCount: 1,
    unmanagedVictimCount: 1,
    unmanagedFemaleCount: 0,
    unmanagedDeathCount: 0,
    unmanagedSevereCount: 1,
    medicalCostVnd: '10',
    salaryCostVnd: '20',
    compensationCostVnd: '30',
    lostWorkDays: 2,
    propertyDamageVnd: '40',
  },
  article39TotalCases: 1,
  article39FatalCases: 0,
  article39MultiVictimCases: 1,
  article39VictimCount: 2,
  article39FemaleCount: 1,
  article39DeathCount: 0,
  article39SevereCount: 1,
  article39UnmanagedVictimCount: 1,
  article39UnmanagedFemaleCount: 0,
  article39UnmanagedDeathCount: 0,
  article39UnmanagedSevereCount: 1,
  article39MedicalCostVnd: '10',
  article39SalaryCostVnd: '20',
  article39CompensationCostVnd: '30',
  article39LostWorkDays: 2,
  article39PropertyDamageVnd: '40',
  cases: [
    {
      id: 30,
      accidentDate: '2026-03-15',
      primaryCause: {
        id: 1,
        causeCode: '1',
        causeName: 'Thiếu thiết bị an toàn',
      },
      injuryFactor: {
        id: 3,
        factorCode: 'M3',
        factorName: 'Thiết bị nặng',
      },
      medicalCostVnd: '100',
      salaryCostVnd: '200',
      compensationCostVnd: '300',
      lostWorkDays: 4,
      propertyDamageVnd: '500',
      victimGroups: [
        {
          occupationId: 100,
          occupation: {
            id: 100,
            occupationCode: '1111',
            occupationName: 'Quản lý',
          },
          isUnderEnterpriseManagement: true,
          victimCount: 2,
          femaleCount: 1,
          deathCount: 1,
          severeCount: 0,
        },
        {
          occupationId: 100,
          occupation: {
            id: 100,
            occupationCode: '1111',
            occupationName: 'Quản lý',
          },
          isUnderEnterpriseManagement: false,
          victimCount: 1,
          femaleCount: 0,
          deathCount: 0,
          severeCount: 1,
        },
      ],
    },
  ],
  submittedAt: null,
  receivedAt: null,
  signedDocumentObjectKey: null,
  signedDocumentOriginalName: null,
  signedDocumentContentType: null,
  signedDocumentSize: null,
  signedDocumentUploadedAt: null,
  draftDocument: null,
  submissions: [],
  updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  ...overrides,
});

describe('OccupationalAccidentReportService', () => {
  let caseRepository: Record<string, ReturnType<typeof vi.fn>>;
  let reportRepository: Record<string, ReturnType<typeof vi.fn>>;
  let reportPeriodRepository: Record<string, ReturnType<typeof vi.fn>>;
  let causeRepository: Record<string, ReturnType<typeof vi.fn>>;
  let injuryFactorRepository: Record<string, ReturnType<typeof vi.fn>>;
  let occupationRepository: Record<string, ReturnType<typeof vi.fn>>;
  let userRepository: Record<string, ReturnType<typeof vi.fn>>;
  let enterpriseRepository: Record<string, ReturnType<typeof vi.fn>>;
  let article39Repository: Record<string, ReturnType<typeof vi.fn>>;
  let submissionRepository: Record<string, ReturnType<typeof vi.fn>>;
  let draftDocumentRepository: Record<string, ReturnType<typeof vi.fn>>;
  let transactionManager: {
    update: ReturnType<typeof vi.fn>;
    getRepository: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let historyRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let dataSource: { transaction: ReturnType<typeof vi.fn>; getRepository: ReturnType<typeof vi.fn> };
  let labelRepository: Record<string, ReturnType<typeof vi.fn>>;
  let fileService: {
    upload: ReturnType<typeof vi.fn>;
    deleteEnterpriseFile: ReturnType<typeof vi.fn>;
    getEnterpriseFileAccessUrl: ReturnType<typeof vi.fn>;
  };
  let service: OccupationalAccidentReportService;

  beforeEach(() => {
    caseRepository = { findOne: vi.fn() };
    reportRepository = {
      findOne: vi.fn(),
      update: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    reportPeriodRepository = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    causeRepository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
    };
    injuryFactorRepository = { findOne: vi.fn() };
    occupationRepository = { find: vi.fn() };
    userRepository = {
      findOne: vi.fn().mockResolvedValue({ id: 1, enterpriseId: 2 }),
    };
    enterpriseRepository = {
      findOne: vi.fn().mockResolvedValue({
        id: 2,
        isActive: true,
        businessType: {},
        industry: {},
      }),
      find: vi.fn().mockResolvedValue([]),
    };
    article39Repository = { save: vi.fn() };
    submissionRepository = {
      create: vi.fn((value) => value),
      save: vi.fn(async (value) => ({ id: 50, ...value })),
      createQueryBuilder: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ max: '0' }),
      })),
    };
    draftDocumentRepository = {
      save: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    historyRepository = {
      create: vi.fn((value) => value),
      save: vi.fn().mockResolvedValue(undefined),
    };
    transactionManager = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      getRepository: vi.fn((entity) =>
        entity === OccupationalAccidentReportSubmissionEntity
          ? submissionRepository
          : historyRepository,
      ),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    labelRepository = {
      find: vi.fn().mockResolvedValue([
        { value: 'MISSING_WORKFORCE', label: 'Thiếu số liệu lao động', reason: 'Bổ sung số liệu lao động.' },
        { value: 'MISSING_SIGNATURE', label: 'Tài liệu thiếu chữ ký', reason: 'Bổ sung chữ ký.' },
        { value: 'INCONSISTENT_DATA', label: 'Số liệu không khớp', reason: 'Kiểm tra số liệu.' },
      ]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn(value => value),
      save: vi.fn(async value => value),
    };
    dataSource = {
      getRepository: vi.fn(() => labelRepository),
      transaction: vi.fn(async (callback) => callback(transactionManager)),
    };
    fileService = {
      upload: vi.fn(),
      deleteEnterpriseFile: vi.fn().mockResolvedValue(undefined),
      getEnterpriseFileAccessUrl: vi.fn(
        (objectKey: string) => `https://files.example.com/${objectKey}`,
      ),
    };

    service = new OccupationalAccidentReportService(
      reportRepository as never,
      caseRepository as never,
      {} as never,
      {} as never,
      article39Repository as never,
      submissionRepository as never,
      draftDocumentRepository as never,
      userRepository as never,
      enterpriseRepository as never,
      reportPeriodRepository as never,
      causeRepository as never,
      injuryFactorRepository as never,
      occupationRepository as never,
      dataSource as never,
      fileService as never,
    );
  });

  it('aggregates regular accidents, article 39 and every breakdown', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport());
    causeRepository.find.mockResolvedValue([
      {
        id: 1,
        causeCode: 'NSDL-01',
        causeName: 'Thiếu thiết bị an toàn',
        displayOrder: 1,
        isActive: true,
      },
      {
        id: 2,
        causeCode: 'NSDL-02',
        causeName: 'Thiếu phương tiện bảo vệ',
        displayOrder: 2,
        isActive: true,
      },
    ]);

    const result = await service.getOverview(1, 20);

    expect(result.regular).toMatchObject({
      totalCases: 1,
      fatalCases: 1,
      multiVictimCases: 1,
      victimCount: 3,
      femaleCount: 1,
      deathCount: 1,
      severeCount: 1,
      unmanagedVictimCount: 1,
      totalCostVnd: '600',
      lostWorkDays: 4,
      propertyDamageVnd: '500',
    });
    expect(result.article39).toMatchObject({
      totalCases: 1,
      victimCount: 2,
      totalCostVnd: '60',
    });
    expect(result.grandTotal).toMatchObject({
      totalCases: 2,
      victimCount: 5,
      totalCostVnd: '660',
      lostWorkDays: 6,
      propertyDamageVnd: '540',
    });
    expect(result.byCause).toEqual([
      expect.objectContaining({
        id: 1,
        code: '1',
        totalCases: 1,
        victimCount: 3,
      }),
      expect.objectContaining({
        id: 2,
        code: '2',
        totalCases: 0,
        victimCount: 0,
      }),
    ]);
    expect(result.byInjuryFactor).toEqual([
      expect.objectContaining({ id: 3, totalCases: 1, victimCount: 3 }),
    ]);
    expect(result.byOccupation).toEqual([
      expect.objectContaining({ id: 100, totalCases: 1, victimCount: 3 }),
    ]);
  });

  it('allows one case to be both fatal and multi-victim in article 39', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport());

    await service.updateArticle39Summary(1, 20, {
      totalCases: 1,
      fatalCases: 1,
      multiVictimCases: 1,
      victimCount: 2,
      femaleCount: 0,
      deathCount: 1,
      severeCount: 0,
      unmanagedVictimCount: 0,
      unmanagedFemaleCount: 0,
      unmanagedDeathCount: 0,
      unmanagedSevereCount: 0,
      medicalCostVnd: '0',
      salaryCostVnd: '0',
      compensationCostVnd: '0',
      lostWorkDays: 0,
      propertyDamageVnd: '0',
    });

    expect(article39Repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCases: 1,
        fatalCases: 1,
        multiVictimCases: 1,
        victimCount: 2,
        deathCount: 1,
      }),
    );
  });

  it('returns active periods that have not been started yet', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-12-20T00:00:00.000Z'));
      reportRepository.createQueryBuilder.mockReturnValue(makeQueryBuilder([]));
      reportPeriodRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([
          makePeriod({
            submissionStartDate: '2026-12-15',
            submissionEndDate: '2027-01-10',
          }),
        ]),
      );

      const result = await service.getMyReports(1, { year: 2026 });

      expect(result).toEqual([
        expect.objectContaining({
          id: null,
          enterpriseId: 2,
          reportPeriodId: 10,
          status: OccupationalAccidentReportListStatus.NOT_STARTED,
          isSubmissionOpen: true,
        }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('derives the statistical range from the year and period code', () => {
    const range = (service as any).getCoverageDateRange(
      makePeriod({
        submissionStartDate: '2026-12-15',
        submissionEndDate: '2027-01-10',
      }),
    );

    expect(range).toEqual(['2026-01-01', '2026-12-31']);
  });

  it('returns a paginated admin queue without draft reports', async () => {
    const report = makeReport({
      status: OccupationalAccidentReportStatus.SUBMITTED,
      enterpriseName: 'Công ty An Toàn',
      taxCode: '0312345678',
    });
    const builder = makeAdminQueryBuilder([report], 11);
    reportRepository.createQueryBuilder.mockReturnValue(builder);

    const result = await service.getAdminReports({
      search: ' an toàn ',
      year: 2026,
      status: OccupationalAccidentReportStatus.SUBMITTED,
      page: 2,
      pageSize: 10,
    });

    expect(builder.where).toHaveBeenCalledWith(
      'report.status != :draftStatus',
      { draftStatus: OccupationalAccidentReportStatus.DRAFT },
    );
    expect(builder.skip).toHaveBeenCalledWith(10);
    expect(builder.take).toHaveBeenCalledWith(10);
    expect(result).toMatchObject({
      total: 11,
      page: 2,
      pageSize: 10,
      data: [
        {
          id: 20,
          enterpriseName: 'Công ty An Toàn',
          taxCode: '0312345678',
          status: OccupationalAccidentReportStatus.SUBMITTED,
        },
      ],
    });
  });

  it('filters the admin queue by enterprise province and ward', async () => {
    const builder = makeAdminQueryBuilder([]);
    reportRepository.createQueryBuilder.mockReturnValue(builder);

    await service.getAdminReports({
      provinceId: '79',
      wardId: '26740',
      page: 1,
      pageSize: 10,
    });

    expect(builder.innerJoin).toHaveBeenCalledWith(
      'report.enterprise',
      'enterprise',
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'enterprise.province_id = :provinceId',
      { provinceId: '79' },
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'enterprise.ward_id = :wardId',
      { wardId: '26740' },
    );
  });

  it('filters by flags on the server and counts before flag filtering or pagination', async () => {
    const builder = makeAdminQueryBuilder([]);
    reportRepository.createQueryBuilder.mockReturnValue(builder);
    const result = await service.getAdminReports({ reviewFlag: 'MISSING_WORKFORCE', page: 2, pageSize: 1 });
    expect(builder.andWhere).toHaveBeenCalledWith('report.review_flags @> CAST(:reviewFlags AS jsonb)', {
      reviewFlags: '["MISSING_WORKFORCE"]',
    });
    expect(result.flagCounts).toEqual({ flagged: 2, unflagged: 1, MISSING_WORKFORCE: 2, MISSING_SIGNATURE: 1, INCONSISTENT_DATA: 0 });
    const counts = builder.clone.mock.results[0].value;
    expect(counts.andWhere).toHaveBeenCalledExactlyOnceWith('report.status = :reviewStatus', { reviewStatus: 'SUBMITTED' });
    expect(builder.skip).toHaveBeenCalledWith(1);
  });

  it.each(['flagged', 'unflagged'] as const)('filters the %s review queue', async (reviewFlag) => {
    const builder = makeAdminQueryBuilder([]);
    reportRepository.createQueryBuilder.mockReturnValue(builder);
    await service.getAdminReports({ reviewFlag, page: 1, pageSize: 10 });
    expect(builder.andWhere).toHaveBeenCalledWith(`report.review_flags ${reviewFlag === 'flagged' ? '<>' : '='} '[]'::jsonb`);
  });

  it('saves review metadata without changing status or adding a business transition', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 3 }));
    reportRepository.update.mockResolvedValue({ affected: 1 });
    await service.updateReviewFlags(99, 20, { flags: ['MISSING_WORKFORCE', 'MISSING_SIGNATURE'], note: ' Nội bộ ', version: 3 });
    expect(reportRepository.update).toHaveBeenCalledWith(
      { id: 20, status: 'SUBMITTED', version: 3 },
      { reviewFlags: ['MISSING_WORKFORCE', 'MISSING_SIGNATURE'], reviewNote: 'Nội bộ', reviewUpdatedBy: 99, reviewUpdatedAt: expect.any(Date), updatedBy: 99 },
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(historyRepository.save).not.toHaveBeenCalled();
  });

  it('allows removing all flags and clearing the internal note', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 3 }));
    reportRepository.update.mockResolvedValue({ affected: 1 });
    await service.updateReviewFlags(99, 20, { flags: [], note: '', version: 3 });
    expect(reportRepository.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ reviewFlags: [], reviewNote: '' }));
  });

  it('creates reusable custom labels with normalized names and stable codes', async () => {
    const result = await service.createReviewLabel(99, { label: '  Thiếu   số liệu quý III  ' });
    expect(result).toMatchObject({ label: 'Thiếu số liệu quý III', value: expect.stringMatching(/^CUSTOM_[A-F0-9]{32}$/) });
    expect(labelRepository.save).toHaveBeenCalledWith(expect.objectContaining({ normalizedLabel: 'thiếu số liệu quý iii', createdBy: 99 }));
    expect(result.reason).toContain('Thiếu số liệu quý III');
  });

  it('reuses an existing label regardless of capitalization or repeated spaces', async () => {
    const existing = { value: 'MISSING_SIGNATURE', label: 'Tài liệu thiếu chữ ký', reason: 'Bổ sung chữ ký.' };
    labelRepository.findOne.mockResolvedValue(existing);
    expect(await service.createReviewLabel(99, { label: '  TÀI LIỆU   thiếu chữ ký  ' })).toEqual(existing);
    expect(labelRepository.findOne).toHaveBeenCalledWith({ where: { normalizedLabel: 'tài liệu thiếu chữ ký' } });
    expect(labelRepository.save).not.toHaveBeenCalled();
  });

  it('reuses the canonical label when two admins create the same name concurrently', async () => {
    const canonical = { value: `CUSTOM_${'A'.repeat(32)}`, label: 'Thiếu số liệu quý III', reason: 'Bổ sung số liệu quý III.' };
    labelRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(canonical);
    labelRepository.save.mockRejectedValue(new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505' })));
    expect(await service.createReviewLabel(99, { label: 'Thiếu số liệu quý III' })).toEqual(canonical);
  });

  it('applies registered custom labels without requiring a note or removing legacy notes', async () => {
    const value = `CUSTOM_${'A'.repeat(32)}`;
    labelRepository.find.mockResolvedValue([{ value, label: 'Thiếu số liệu quý III', reason: 'Bổ sung quý III.' }]);
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 3, reviewNote: 'Ghi chú cũ' }));
    reportRepository.update.mockResolvedValue({ affected: 1 });
    await service.updateReviewFlags(99, 20, { flags: [value], version: 3 });
    expect(reportRepository.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ reviewFlags: [value], reviewNote: 'Ghi chú cũ' }));
  });

  it('rejects an unregistered custom label before updating a report', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 3 }));
    await expect(service.updateReviewFlags(99, 20, { flags: [`CUSTOM_${'A'.repeat(32)}`], version: 3 })).rejects.toThrow(BadRequestException);
    expect(reportRepository.update).not.toHaveBeenCalled();
  });

  it('filters and counts custom labels across the filtered queue', async () => {
    const value = `CUSTOM_${'A'.repeat(32)}`;
    const label = { value, label: 'Thiếu số liệu quý III', reason: 'Bổ sung quý III.' };
    labelRepository.find.mockResolvedValue([label]);
    const builder = makeAdminQueryBuilder([]);
    builder.clone.mockImplementation(() => ({
      andWhere: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), addSelect: vi.fn().mockReturnThis(), setParameter: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ flagged: '2', unflagged: '1', [value]: '2' }),
    }));
    reportRepository.createQueryBuilder.mockReturnValue(builder);
    const result = await service.getAdminReports({ reviewFlag: value, page: 1, pageSize: 1 });
    expect(result.reviewLabels).toEqual([label]);
    expect(result.flagCounts[value]).toBe(2);
    expect(builder.andWhere).toHaveBeenCalledWith('report.review_flags @> CAST(:reviewFlags AS jsonb)', { reviewFlags: JSON.stringify([value]) });
  });

  it('rejects concurrent flag changes', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 4 }));
    reportRepository.update.mockResolvedValue({ affected: 0 });
    await expect(service.updateReviewFlags(99, 20, { flags: [], note: '', version: 3 })).rejects.toThrow(ConflictException);
  });

  it.each(['RETURNED', 'RECEIVED', 'DRAFT'])('does not flag a %s report', async status => {
    reportRepository.findOne.mockResolvedValue(makeReport({ status }));
    await expect(service.updateReviewFlags(99, 20, { flags: [], note: '', version: 3 })).rejects.toThrow(ConflictException);
    expect(reportRepository.update).not.toHaveBeenCalled();
  });

  it('does not expose internal flags or notes in enterprise responses or submission snapshots', async () => {
    const report = makeReport({ reviewFlags: ['MISSING_SIGNATURE'], reviewNote: 'Chỉ nội bộ', reviewUpdatedBy: 99, reviewUpdatedAt: new Date() });
    reportRepository.findOne.mockResolvedValue(report);
    const enterpriseResponse = await service.getMyReport(1, 20);
    const adminResponse = await service.getAdminReport(20);
    const snapshot = (service as any).buildSubmissionSnapshot(report, new Date());
    for (const key of ['reviewFlags', 'reviewNote', 'reviewUpdatedBy', 'reviewUpdatedAt']) {
      expect(enterpriseResponse).not.toHaveProperty(key);
      expect(snapshot).not.toHaveProperty(key);
      expect(adminResponse).toHaveProperty(key);
    }
  });

  it('archives internal review metadata on return and clears the active flags atomically', async () => {
    const metadata = { reviewFlags: ['MISSING_SIGNATURE'], reviewNote: 'Chỉ nội bộ', reviewUpdatedBy: 98, reviewUpdatedAt: new Date() };
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 3, ...metadata }));
    await service.returnReport(99, 20, 'Vui lòng bổ sung bản có chữ ký.', 3);
    expect(transactionManager.update).toHaveBeenCalledWith(expect.anything(), { id: 20, status: 'SUBMITTED', version: 3 }, expect.objectContaining({ reviewFlags: [], reviewNote: '', reviewUpdatedAt: null, reviewUpdatedBy: null }));
    expect(historyRepository.save).toHaveBeenCalledWith(expect.objectContaining({ ...metadata, reason: 'Vui lòng bổ sung bản có chữ ký.' }));
  });

  it('rejects a bulk decision made before another admin changed the review flags', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 4 }));
    await expect(service.returnReport(99, 20, 'Vui lòng bổ sung bản có chữ ký.', 3)).rejects.toThrow(ConflictException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a concurrent transition without writing a stale review history', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ status: 'SUBMITTED', version: 3 }));
    transactionManager.update.mockResolvedValue({ affected: 0 });
    await expect(service.returnReport(99, 20, 'Vui lòng bổ sung bản có chữ ký.', 3)).rejects.toThrow(ConflictException);
    expect(historyRepository.save).not.toHaveBeenCalled();
  });

  it('filters the admin queue by enterprise name and tax code separately', async () => {
    const builder = makeAdminQueryBuilder([]);
    reportRepository.createQueryBuilder.mockReturnValue(builder);

    await service.getAdminReports({
      enterpriseName: ' Thiên Ân ',
      taxCode: ' 0317 ',
      page: 1,
      pageSize: 10,
    });

    expect(builder.andWhere).toHaveBeenCalledWith(
      'LOWER(report.enterprise_name) LIKE :enterpriseName',
      { enterpriseName: '%thiên ân%' },
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'report.tax_code LIKE :taxCode',
      { taxCode: '%0317%' },
    );
  });

  it('does not join enterprises when no location filter is given', async () => {
    const builder = makeAdminQueryBuilder([]);
    reportRepository.createQueryBuilder.mockReturnValue(builder);

    await service.getAdminReports({ page: 1, pageSize: 10 });

    expect(builder.innerJoin).not.toHaveBeenCalled();
  });

  it('aggregates received reports for the admin summary', async () => {
    const report = makeReport({
      status: OccupationalAccidentReportStatus.RECEIVED,
      businessTypeCode: 'CTCP',
      businessTypeName: 'Công ty cổ phần',
    });
    const builder = makeAdminQueryBuilder([report]);
    reportRepository.createQueryBuilder.mockReturnValue(builder);
    enterpriseRepository.find.mockResolvedValue([
      {
        id: 2,
        isActive: true,
        businessType: {
          typeCode: 'CTCP',
          typeName: 'Công ty cổ phần',
        },
      },
    ]);

    const result = await service.getAdminSummary({ year: 2026 });

    expect(builder.where).toHaveBeenCalledWith(
      'report.status = :receivedStatus',
      { receivedStatus: OccupationalAccidentReportStatus.RECEIVED },
    );
    expect(result).toMatchObject({
      reportCount: 1,
      registeredEnterpriseCount: 1,
      enterpriseCount: 1,
      totalEmployees: 30,
      femaleEmployees: 12,
      payrollFundVnd: '100000000',
      overview: {
        grandTotal: {
          totalCases: 2,
          victimCount: 5,
          totalCostVnd: '660',
        },
      },
      byIndustry: [
        {
          code: '6201',
          name: 'Lập trình máy vi tính',
          totalCases: 2,
          victimCount: 5,
          totalCostVnd: '660',
        },
      ],
      byBusinessType: [
        {
          code: 'CTCP',
          name: 'Công ty cổ phần',
          totalEnterpriseCount: 1,
          enterpriseCount: 1,
          accidentSummary: { totalCases: 2, victimCount: 5 },
        },
      ],
    });
    expect(result.accidentFrequencyPerThousand).toBeCloseTo(166.66666666666666);
    expect(result.fatalityFrequencyPerThousand).toBeCloseTo(33.333333333333336);
    expect(result.byBusinessType[0].accidentFrequencyPerThousand).toBe(
      result.accidentFrequencyPerThousand,
    );
    expect(result.byBusinessType[0].fatalityFrequencyPerThousand).toBe(
      result.fatalityFrequencyPerThousand,
    );
  });

  it('calculates frequencies from aggregated counts and workforce for each scope', async () => {
    const reports = [
      makeReport({ status: OccupationalAccidentReportStatus.RECEIVED }),
      makeReport({
        id: 21,
        enterpriseId: 3,
        status: OccupationalAccidentReportStatus.RECEIVED,
        totalEmployees: 70,
        noAccidentsDeclared: true,
        article39Summary: null,
        cases: [],
      }),
      makeReport({
        id: 22,
        enterpriseId: 4,
        status: OccupationalAccidentReportStatus.RECEIVED,
        totalEmployees: 200,
        businessTypeCode: 'TNHH',
        businessTypeName: 'Công ty trách nhiệm hữu hạn',
      }),
    ];
    reportRepository.createQueryBuilder.mockReturnValue(
      makeAdminQueryBuilder(reports),
    );

    const result = await service.getAdminSummary();

    expect(result.totalEmployees).toBe(300);
    expect(result.accidentFrequencyPerThousand).toBeCloseTo(
      33.333333333333336,
      10,
    );
    expect(result.fatalityFrequencyPerThousand).toBeCloseTo(
      6.666666666666667,
      10,
    );
    expect(result.byBusinessType).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CTCP',
          totalEmployees: 100,
          accidentFrequencyPerThousand: 50,
          fatalityFrequencyPerThousand: 10,
        }),
        expect.objectContaining({
          code: 'TNHH',
          totalEmployees: 200,
          accidentFrequencyPerThousand: 25,
          fatalityFrequencyPerThousand: 5,
        }),
      ]),
    );
  });

  it('returns zero frequencies for an empty summary and registered-only business types', async () => {
    reportRepository.createQueryBuilder.mockReturnValue(
      makeAdminQueryBuilder([]),
    );
    enterpriseRepository.find.mockResolvedValue([
      {
        id: 2,
        isActive: true,
        businessType: { typeCode: 'CTCP', typeName: 'Công ty cổ phần' },
      },
    ]);

    const result = await service.getAdminSummary();

    expect(result).toMatchObject({
      totalEmployees: 0,
      accidentFrequencyPerThousand: 0,
      fatalityFrequencyPerThousand: 0,
      byBusinessType: [
        {
          code: 'CTCP',
          totalEmployees: 0,
          accidentFrequencyPerThousand: 0,
          fatalityFrequencyPerThousand: 0,
        },
      ],
    });
  });

  it('returns zero frequencies when the reported workforce is zero', async () => {
    reportRepository.createQueryBuilder.mockReturnValue(
      makeAdminQueryBuilder([
        makeReport({
          status: OccupationalAccidentReportStatus.RECEIVED,
          totalEmployees: 0,
        }),
      ]),
    );

    const result = await service.getAdminSummary();

    expect(result).toMatchObject({
      accidentFrequencyPerThousand: 0,
      fatalityFrequencyPerThousand: 0,
      byBusinessType: [
        {
          accidentFrequencyPerThousand: 0,
          fatalityFrequencyPerThousand: 0,
        },
      ],
    });
  });

  it('allows an admin to receive a submitted report and records history', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({
        status: OccupationalAccidentReportStatus.SUBMITTED,
        histories: [],
        submissions: [makeSubmission()],
      }),
    );

    await service.receiveReport(99, 20);

    expect(transactionManager.update).toHaveBeenCalledWith(
      expect.any(Function),
      { id: 20, status: OccupationalAccidentReportStatus.SUBMITTED },
      expect.objectContaining({
        status: OccupationalAccidentReportStatus.RECEIVED,
        updatedBy: 99,
      }),
    );
    expect(historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: 20,
        fromStatus: OccupationalAccidentReportStatus.SUBMITTED,
        toStatus: OccupationalAccidentReportStatus.RECEIVED,
        reason: null,
      }),
    );
  });

  it('requires a meaningful reason when returning a report', async () => {
    await expect(service.returnReport(99, 20, ' thiếu ')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not receive a submitted report without its signed PDF', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({
        status: OccupationalAccidentReportStatus.SUBMITTED,
        histories: [],
        signedDocumentObjectKey: null,
      }),
    );

    await expect(service.receiveReport(99, 20)).rejects.toThrow(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('returns a submitted report for supplementation and records the reason', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({
        status: OccupationalAccidentReportStatus.SUBMITTED,
        histories: [],
      }),
    );

    await service.returnReport(
      99,
      20,
      '  Vui lòng kiểm tra lại số người bị thương nặng.  ',
    );

    expect(transactionManager.update).toHaveBeenCalledWith(
      expect.any(Function),
      { id: 20, status: OccupationalAccidentReportStatus.SUBMITTED },
      expect.objectContaining({
        status: OccupationalAccidentReportStatus.RETURNED,
        returnedReason: 'Vui lòng kiểm tra lại số người bị thương nặng.',
        updatedBy: 99,
      }),
    );
    expect(historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: OccupationalAccidentReportStatus.RETURNED,
        reason: 'Vui lòng kiểm tra lại số người bị thương nặng.',
      }),
    );
  });

  it('does not allow an admin to process a report twice', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({
        status: OccupationalAccidentReportStatus.RECEIVED,
        histories: [],
      }),
    );

    await expect(service.receiveReport(99, 20)).rejects.toThrow(
      ConflictException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects zero employees even when no accidents are declared', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ cases: [] }));

    await expect(
      service.updateHeader(1, 20, {
        totalEmployees: 0,
        femaleEmployees: 0,
        payrollFundVnd: '0',
        noAccidentsDeclared: true,
      }),
    ).rejects.toThrow('Tổng số lao động phải lớn hơn 0.');
    expect(reportRepository.update).not.toHaveBeenCalled();
  });

  it.each(['0', '0000'])('rejects zero payroll %s even when no accidents are declared', async (payrollFundVnd) => {
    reportRepository.findOne.mockResolvedValue(makeReport({ cases: [] }));
    await expect(service.updateHeader(1, 20, {
      totalEmployees: 10, femaleEmployees: 0, payrollFundVnd, noAccidentsDeclared: true,
    })).rejects.toThrow('Tổng quỹ lương phải lớn hơn 0.');
    expect(reportRepository.update).not.toHaveBeenCalled();
  });

  it('rejects inconsistent workforce totals', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport());

    await expect(
      service.updateHeader(1, 20, {
        totalEmployees: 5,
        femaleEmployees: 6,
        payrollFundVnd: '1000',
        noAccidentsDeclared: false,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(reportRepository.update).not.toHaveBeenCalled();
  });

  it('rejects workforce totals below managed victims in an existing case', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport());

    await expect(
      service.updateHeader(1, 20, {
        totalEmployees: 1,
        femaleEmployees: 1,
        payrollFundVnd: '1000',
        noAccidentsDeclared: false,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(reportRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a case whose managed victims exceed the workforce', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({ totalEmployees: 1, femaleEmployees: 1 }),
    );
    causeRepository.findOne.mockResolvedValue({ id: 1, isActive: true });
    injuryFactorRepository.findOne.mockResolvedValue({
      id: 3,
      isActive: true,
    });
    occupationRepository.find.mockResolvedValue([
      { id: 100, level: 4, isActive: true },
    ]);

    await expect(
      service.createCase(1, 20, {
        accidentDate: '2026-03-15',
        primaryCauseId: 1,
        injuryFactorId: 3,
        medicalCostVnd: '0',
        salaryCostVnd: '0',
        compensationCostVnd: '0',
        lostWorkDays: 0,
        propertyDamageVnd: '0',
        victimGroups: [
          {
            occupationId: 100,
            isUnderEnterpriseManagement: true,
            victimCount: 2,
            femaleCount: 1,
            deathCount: 0,
            severeCount: 0,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each(['create', 'update'] as const)(
    'can %s a case without a date and preserves historical dates on update',
    async (operation) => {
      const report = makeReport();
      reportRepository.findOne.mockResolvedValue(report);
      caseRepository.findOne.mockResolvedValue(report.cases[0]);
      causeRepository.findOne.mockResolvedValue({ id: 1, isActive: true });
      injuryFactorRepository.findOne.mockResolvedValue({
        id: 3,
        isActive: true,
      });
      occupationRepository.find.mockResolvedValue([
        { id: 100, level: 4, isActive: true },
      ]);
      const storedCase = {
        create: vi.fn((value) => value),
        save: vi.fn(async (value) => ({ ...value, id: 30 })),
        update: vi.fn(),
      };
      const storedGroups = {
        create: vi.fn((value) => value),
        save: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      };
      transactionManager.getRepository.mockImplementation((entity) =>
        entity === OccupationalAccidentCaseEntity ? storedCase : storedGroups,
      );
      const body: SaveAccidentCaseDto = {
        primaryCauseId: 1,
        injuryFactorId: 3,
        medicalCostVnd: '0',
        salaryCostVnd: '0',
        compensationCostVnd: '0',
        propertyDamageVnd: '0',
        lostWorkDays: 0,
        victimGroups: [
          {
            occupationId: 100,
            isUnderEnterpriseManagement: true,
            victimCount: 1,
            femaleCount: 0,
            deathCount: 0,
            severeCount: 0,
          },
        ],
      };
      if (operation === 'create') {
        await service.createCase(1, 20, body);
        expect(storedCase.save).toHaveBeenCalledWith(
          expect.objectContaining({ accidentDate: null }),
        );
      } else {
        await service.updateCase(1, 20, 30, body);
        expect(storedCase.update).toHaveBeenCalledWith(
          30,
          expect.objectContaining({ primaryCauseId: 1 }),
        );
        expect(storedCase.update.mock.calls[0][1]).not.toHaveProperty(
          'accidentDate',
        );
      }
    },
  );

  it('returns dated and undated cases in stable case order', async () => {
    const report = makeReport();
    const original = report.cases[0];
    reportRepository.findOne.mockResolvedValue({
      ...report,
      cases: [
        { ...original, id: 32, accidentDate: null },
        { ...original, id: 31, accidentDate: '2026-01-01' },
        original,
      ],
    });
    const response = await service.getMyReport(1, 20);
    expect(response.cases.map((item: { id: number }) => item.id)).toEqual([
      30, 31, 32,
    ]);
    expect(response.cases[2].accidentDate).toBeNull();
  });

  it('rejects money values beyond the PostgreSQL BIGINT limit', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport());

    await expect(
      service.updateHeader(1, 20, {
        totalEmployees: 5,
        femaleEmployees: 2,
        payrollFundVnd: '9223372036854775808',
        noAccidentsDeclared: false,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(reportRepository.update).not.toHaveBeenCalled();
  });

  it('requires the workforce header before submitting', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({ totalEmployees: 0, noAccidentsDeclared: true }),
    );

    await expect(service.submit(1, 20)).rejects.toThrow(BadRequestException);
  });

  it('requires positive payroll before submitting an existing draft', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport({ payrollFundVnd: '0' }));
    await expect(service.submit(1, 20)).rejects.toThrow('Vui lòng hoàn thành thông tin lao động và quỹ lương trước khi gửi báo cáo.');
    expect(dataSource.transaction).not.toHaveBeenCalled();
    const response = await service.getMyReport(1, 20);
    expect(response.headerCompleted).toBe(false);
  });

  it('rejects submission when an existing case exceeds the workforce', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({ totalEmployees: 1, femaleEmployees: 1 }),
    );

    await expect(service.submit(1, 20)).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('requires a signed PDF before submitting a completed report', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({ signedDocumentObjectKey: null }),
    );

    await expect(service.submit(1, 20)).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates an immutable numbered submission snapshot and consumes the draft PDF', async () => {
    const document = {
      reportId: 20,
      documentObjectKey: 'enterprise-files/2/draft.pdf',
      documentOriginalName: 'draft.pdf',
      documentContentType: 'application/pdf',
      documentSize: '8',
      documentSha256: 'b'.repeat(64),
      uploadedBy: 1,
      uploadedAt: new Date('2026-11-09T00:00:00.000Z'),
    };
    reportRepository.findOne.mockResolvedValue(
      makeReport({ draftDocument: document }),
    );

    await service.submit(1, 20);

    expect(submissionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: 20,
        submissionNo: 1,
        documentObjectKey: document.documentObjectKey,
        documentSha256: document.documentSha256,
        payloadSnapshot: expect.objectContaining({
          schemaVersion: 1,
          status: OccupationalAccidentReportStatus.SUBMITTED,
          article39Summary: expect.objectContaining({ totalCases: 1 }),
        }),
      }),
    );
    expect(historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: 50 }),
    );
    expect(transactionManager.delete).toHaveBeenCalledWith(
      expect.any(Function),
      { reportId: 20 },
    );
    expect(fileService.deleteEnterpriseFile).not.toHaveBeenCalled();
  });

  it('uploads a signed PDF and stores its metadata', async () => {
    const file = {
      originalname: 'bao-cao-da-ky.pdf',
      mimetype: 'application/pdf',
      size: 8,
      buffer: Buffer.from('%PDF-1.4'),
    };
    const uploadedAt = new Date('2026-11-08T00:00:00.000Z');
    fileService.upload.mockResolvedValue({
      objectKey:
        'enterprise-files/2/2026/11/550e8400-e29b-41d4-a716-446655440000.pdf',
      originalName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      uploadedAt,
    });
    reportRepository.findOne.mockResolvedValue(makeReport());

    await service.uploadSignedDocument(1, 20, file);

    expect(fileService.upload).toHaveBeenCalledWith(
      file,
      'enterprise-files',
      2,
    );
    expect(draftDocumentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: 20,
        documentOriginalName: file.originalname,
        documentContentType: 'application/pdf',
        documentSize: '8',
        documentSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        uploadedAt,
      }),
    );
  });

  it('invalidates the signed PDF when report data changes', async () => {
    const objectKey =
      'enterprise-files/2/2026/11/550e8400-e29b-41d4-a716-446655440000.pdf';
    reportRepository.findOne.mockResolvedValue(
      makeReport({
        draftDocument: {
          reportId: 20,
          documentObjectKey: objectKey,
        },
      }),
    );

    await service.updateHeader(1, 20, {
      totalEmployees: 30,
      femaleEmployees: 12,
      payrollFundVnd: '1000',
      noAccidentsDeclared: false,
    });

    expect(draftDocumentRepository.delete).toHaveBeenCalledWith(20);
    expect(fileService.deleteEnterpriseFile).toHaveBeenCalledWith(objectKey);
  });

  it('locks a submitted report against further edits', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({ status: OccupationalAccidentReportStatus.SUBMITTED }),
    );

    await expect(
      service.updateHeader(1, 20, {
        totalEmployees: 30,
        femaleEmployees: 12,
        payrollFundVnd: '1000',
        noAccidentsDeclared: false,
      }),
    ).rejects.toThrow(ConflictException);
    expect(reportRepository.update).not.toHaveBeenCalled();
  });
});
