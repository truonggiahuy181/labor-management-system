import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OccupationalAccidentReportListStatus,
  OccupationalAccidentReportStatus,
} from '../occupational-accident-report.constants.js';
import { OccupationalAccidentReportService } from '../occupational-accident-report.service.js';

const makeQueryBuilder = (rows: unknown[]) => ({
  innerJoinAndSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  addOrderBy: vi.fn().mockReturnThis(),
  getMany: vi.fn().mockResolvedValue(rows),
});

const makeAdminQueryBuilder = (rows: unknown[], total = rows.length) => ({
  innerJoinAndSelect: vi.fn().mockReturnThis(),
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
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  isActive: true,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const makeReport = (overrides: Record<string, unknown> = {}) => ({
  id: 20,
  enterpriseId: 2,
  reportPeriodId: 10,
  reportPeriod: makePeriod(),
  status: OccupationalAccidentReportStatus.DRAFT,
  noAccidentsDeclared: false,
  headerCompleted: true,
  totalEmployees: 30,
  femaleEmployees: 12,
  payrollFundVnd: '100000000',
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
      accidentCause: {
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
  updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  ...overrides,
});

describe('OccupationalAccidentReportService', () => {
  let reportRepository: Record<string, ReturnType<typeof vi.fn>>;
  let reportPeriodRepository: Record<string, ReturnType<typeof vi.fn>>;
  let userRepository: Record<string, ReturnType<typeof vi.fn>>;
  let enterpriseRepository: Record<string, ReturnType<typeof vi.fn>>;
  let transactionManager: {
    update: ReturnType<typeof vi.fn>;
    getRepository: ReturnType<typeof vi.fn>;
  };
  let historyRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let fileService: {
    upload: ReturnType<typeof vi.fn>;
    deleteEnterpriseFile: ReturnType<typeof vi.fn>;
    getEnterpriseFileAccessUrl: ReturnType<typeof vi.fn>;
  };
  let service: OccupationalAccidentReportService;

  beforeEach(() => {
    reportRepository = {
      findOne: vi.fn(),
      update: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    reportPeriodRepository = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
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
    };
    historyRepository = {
      create: vi.fn((value) => value),
      save: vi.fn().mockResolvedValue(undefined),
    };
    transactionManager = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      getRepository: vi.fn().mockReturnValue(historyRepository),
    };
    dataSource = {
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
      { findOne: vi.fn() } as never,
      {} as never,
      {} as never,
      userRepository as never,
      enterpriseRepository as never,
      reportPeriodRepository as never,
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
      fileService as never,
    );
  });

  it('aggregates regular accidents, article 39 and every breakdown', async () => {
    reportRepository.findOne.mockResolvedValue(makeReport());

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
      expect.objectContaining({ id: 1, totalCases: 1, victimCount: 3 }),
    ]);
    expect(result.byInjuryFactor).toEqual([
      expect.objectContaining({ id: 3, totalCases: 1, victimCount: 3 }),
    ]);
    expect(result.byOccupation).toEqual([
      expect.objectContaining({ id: 100, totalCases: 1, victimCount: 3 }),
    ]);
  });

  it('returns active periods that have not been started yet', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-12-20T00:00:00.000Z'));
      reportRepository.createQueryBuilder.mockReturnValue(makeQueryBuilder([]));
      reportPeriodRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([
          makePeriod({ startDate: '2026-12-15', endDate: '2027-01-10' }),
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
      makePeriod({ startDate: '2026-12-15', endDate: '2027-01-10' }),
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

  it('aggregates received reports for the admin summary', async () => {
    const report = makeReport({
      status: OccupationalAccidentReportStatus.RECEIVED,
      businessTypeCode: 'CTCP',
      businessTypeName: 'Công ty cổ phần',
    });
    const builder = makeAdminQueryBuilder([report]);
    reportRepository.createQueryBuilder.mockReturnValue(builder);

    const result = await service.getAdminSummary({ year: 2026 });

    expect(builder.where).toHaveBeenCalledWith(
      'report.status = :receivedStatus',
      { receivedStatus: OccupationalAccidentReportStatus.RECEIVED },
    );
    expect(result).toMatchObject({
      reportCount: 1,
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
      byBusinessType: [
        {
          code: 'CTCP',
          name: 'Công ty cổ phần',
          enterpriseCount: 1,
          accidentSummary: { totalCases: 2, victimCount: 5 },
        },
      ],
    });
  });

  it('allows an admin to receive a submitted report and records history', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({
        status: OccupationalAccidentReportStatus.SUBMITTED,
        histories: [],
        signedDocumentObjectKey:
          'enterprise-files/2/2026/11/550e8400-e29b-41d4-a716-446655440000.pdf',
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
      makeReport({ headerCompleted: false, noAccidentsDeclared: true }),
    );

    await expect(service.submit(1, 20)).rejects.toThrow(BadRequestException);
  });

  it('requires a signed PDF before submitting a completed report', async () => {
    reportRepository.findOne.mockResolvedValue(
      makeReport({ signedDocumentObjectKey: null }),
    );

    await expect(service.submit(1, 20)).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
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
    expect(reportRepository.update).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        signedDocumentOriginalName: file.originalname,
        signedDocumentContentType: 'application/pdf',
        signedDocumentSize: '8',
        signedDocumentUploadedAt: uploadedAt,
      }),
    );
  });

  it('invalidates the signed PDF when report data changes', async () => {
    const objectKey =
      'enterprise-files/2/2026/11/550e8400-e29b-41d4-a716-446655440000.pdf';
    reportRepository.findOne.mockResolvedValue(
      makeReport({ signedDocumentObjectKey: objectKey }),
    );

    await service.updateHeader(1, 20, {
      totalEmployees: 30,
      femaleEmployees: 12,
      payrollFundVnd: '1000',
      noAccidentsDeclared: false,
    });

    expect(reportRepository.update).toHaveBeenCalledWith(
      20,
      expect.objectContaining({ signedDocumentObjectKey: null }),
    );
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
