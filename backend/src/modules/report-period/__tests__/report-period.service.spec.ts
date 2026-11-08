import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportPeriodService } from '../report-period.service.js';

const makeReportPeriod = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  reportName: 'Báo cáo tai nạn lao động',
  reportYear: 2026,
  reportTypeCode: 'OCCUPATIONAL_ACCIDENT',
  periodCode: 'ANNUAL',
  submissionStartDate: '2027-01-01',
  submissionEndDate: '2027-01-09',
  isActive: true,
  createdBy: 10,
  updatedBy: 10,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

const annualDto = (overrides: Record<string, unknown> = {}) => ({
  reportName: 'Báo cáo tai nạn lao động',
  reportYear: 2026,
  reportTypeCode: 'OCCUPATIONAL_ACCIDENT' as const,
  periodCode: 'ANNUAL' as const,
  submissionStartDate: '2027-01-01',
  submissionEndDate: '2027-01-09',
  ...overrides,
});

describe('ReportPeriodService', () => {
  let repository: Record<string, ReturnType<typeof vi.fn>>;
  let accidentReportRepository: { exists: ReturnType<typeof vi.fn> };
  let service: ReportPeriodService;

  beforeEach(() => {
    repository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((values) => values),
      save: vi.fn(async (entity) => makeReportPeriod(entity)),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    accidentReportRepository = { exists: vi.fn().mockResolvedValue(false) };
    service = new ReportPeriodService(
      repository as never,
      accidentReportRepository as never,
    );
  });

  it('filters by explicit report definition and submission window', async () => {
    await service.getAll({
      reportName: 'Báo cáo tai nạn lao động',
      reportYear: 2026,
      reportTypeCode: 'OCCUPATIONAL_ACCIDENT',
      periodCode: 'ANNUAL',
      submissionStartDate: '2027-01-01',
      submissionEndDate: '2027-01-09',
      isActive: false,
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        reportYear: 2026,
        reportTypeCode: 'OCCUPATIONAL_ACCIDENT',
        periodCode: 'ANNUAL',
        submissionStartDate: '2027-01-01',
        submissionEndDate: '2027-01-09',
        isActive: false,
      }),
      order: {
        reportYear: 'DESC',
        submissionStartDate: 'DESC',
        id: 'DESC',
      },
    });
  });

  it('creates a normalized active report period without inferring codes', async () => {
    repository.findOne.mockResolvedValue(null);
    const result = await service.create(
      annualDto({ reportName: '  Báo cáo   tai nạn lao động ' }) as any,
      10,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reportName: 'Báo cáo tai nạn lao động',
        reportTypeCode: 'OCCUPATIONAL_ACCIDENT',
        periodCode: 'ANNUAL',
        isActive: true,
        createdBy: 10,
        updatedBy: 10,
      }),
    );
    expect(result.reportName).toBe('Báo cáo tai nạn lao động');
  });

  it('accepts both statutory occupational-accident windows', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.create(annualDto() as any)).resolves.toMatchObject({
      submissionStartDate: '2027-01-01',
      submissionEndDate: '2027-01-09',
    });
    await expect(
      service.create(
        annualDto({
          periodCode: 'FIRST_HALF',
          submissionStartDate: '2026-07-01',
          submissionEndDate: '2026-07-04',
        }) as any,
      ),
    ).resolves.toMatchObject({ periodCode: 'FIRST_HALF' });
  });

  it.each([
    ['FIRST_HALF', '2026-07-01', '2026-07-05'],
    ['ANNUAL', '2027-01-01', '2027-01-10'],
    ['ANNUAL', '2026-12-31', '2027-01-09'],
  ])(
    'rejects %s dates outside its statutory window',
    async (periodCode, submissionStartDate, submissionEndDate) => {
      await expect(
        service.create(
          annualDto({ periodCode, submissionStartDate, submissionEndDate }) as any,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.findOne).not.toHaveBeenCalled();
    },
  );

  it('allows custom windows only for other report types', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(
      service.create(
        annualDto({
          reportTypeCode: 'OTHER',
          periodCode: 'CUSTOM',
          submissionStartDate: '2026-03-01',
          submissionEndDate: '2026-03-31',
        }) as any,
      ),
    ).resolves.toMatchObject({ reportTypeCode: 'OTHER', periodCode: 'CUSTOM' });

    await expect(
      service.create(annualDto({ reportTypeCode: 'OTHER' }) as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate type, year and period code', async () => {
    repository.findOne.mockResolvedValue(makeReportPeriod());
    await expect(service.create(annualDto() as any)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      service.create(
        annualDto({
          submissionStartDate: '2027-01-09',
          submissionEndDate: '2027-01-01',
        }) as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates a custom window using the merged definition', async () => {
    const entity = makeReportPeriod({
      reportName: 'Báo cáo khác',
      reportTypeCode: 'OTHER',
      periodCode: 'CUSTOM',
      submissionStartDate: '2026-01-01',
      submissionEndDate: '2026-12-31',
    });
    repository.findOne.mockImplementation(async ({ where }) =>
      typeof where.id === 'number' ? entity : null,
    );
    repository.update.mockImplementation(async (_id, values) =>
      Object.assign(entity, values),
    );

    const result = await service.update(
      1,
      { submissionStartDate: '2026-07-01' },
      20,
    );
    expect(repository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        submissionStartDate: '2026-07-01',
        submissionEndDate: '2026-12-31',
        updatedBy: 20,
      }),
    );
    expect(result.submissionStartDate).toBe('2026-07-01');
  });

  it('rejects changing an in-use report definition', async () => {
    repository.findOne.mockResolvedValue(makeReportPeriod());
    accidentReportRepository.exists.mockResolvedValue(true);
    await expect(service.update(1, { reportYear: 2027 }, 20)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('allows changing only the submission window of an in-use period', async () => {
    const entity = makeReportPeriod();
    repository.findOne.mockImplementation(async ({ where }) =>
      typeof where.id === 'number' ? entity : null,
    );
    repository.update.mockImplementation(async (_id, values) =>
      Object.assign(entity, values),
    );
    accidentReportRepository.exists.mockResolvedValue(true);

    await expect(
      service.update(
        1,
        {
          submissionStartDate: '2027-01-02',
          submissionEndDate: '2027-01-08',
        },
        20,
      ),
    ).resolves.toMatchObject({
      submissionStartDate: '2027-01-02',
      submissionEndDate: '2027-01-08',
    });
  });

  it('updates status independently', async () => {
    const entity = makeReportPeriod();
    repository.findOne.mockResolvedValue(entity);
    repository.update.mockImplementation(async (_id, values) =>
      Object.assign(entity, values),
    );
    await expect(service.updateStatus(1, false, 20)).resolves.toMatchObject({
      isActive: false,
    });
  });

  it('only deletes inactive and unused periods', async () => {
    repository.findOne.mockResolvedValue(makeReportPeriod());
    await expect(service.remove(1)).rejects.toThrow(BadRequestException);

    repository.findOne.mockResolvedValue(makeReportPeriod({ isActive: false }));
    accidentReportRepository.exists.mockResolvedValue(true);
    await expect(service.remove(1)).rejects.toThrow(ConflictException);

    accidentReportRepository.exists.mockResolvedValue(false);
    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(1);
  });

  it('returns not found for a missing report period', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.getById(999)).rejects.toThrow(NotFoundException);
  });
});
