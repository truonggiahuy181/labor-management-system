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
  reportPeriod: 'Cả năm',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  isActive: true,
  createdBy: 10,
  updatedBy: 10,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('ReportPeriodService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
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
    service = new ReportPeriodService(repository as any);
  });

  it('filters report periods by every list column', async () => {
    await service.getAll({
      reportName: 'Báo cáo tai nạn lao động',
      reportYear: 2026,
      reportPeriod: 'Cả năm',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      isActive: false,
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        reportName: expect.objectContaining({
          _type: 'ilike',
          _value: 'Báo cáo tai nạn lao động',
        }),
        reportYear: 2026,
        reportPeriod: expect.objectContaining({
          _type: 'ilike',
          _value: 'Cả năm',
        }),
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: false,
      }),
      order: { reportYear: 'DESC', startDate: 'DESC', id: 'DESC' },
    });
  });

  it('creates a normalized active report period', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.create(
      {
        reportName: '  Báo cáo   tai nạn lao động ',
        reportYear: 2026,
        reportPeriod: ' Cả năm ',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      10,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reportName: 'Báo cáo tai nạn lao động',
        reportPeriod: 'Cả năm',
        isActive: true,
        createdBy: 10,
        updatedBy: 10,
      }),
    );
    expect(result.reportName).toBe('Báo cáo tai nạn lao động');
  });

  it('rejects a duplicate name, year and period combination', async () => {
    repository.findOne.mockResolvedValue(makeReportPeriod());

    await expect(
      service.create({
        reportName: 'Báo cáo tai nạn lao động',
        reportYear: 2026,
        reportPeriod: 'Cả năm',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
    ).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      service.create({
        reportName: 'Báo cáo tai nạn lao động',
        reportYear: 2026,
        reportPeriod: 'Cả năm',
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('updates fields and validates the merged date range', async () => {
    const entity = makeReportPeriod();
    repository.findOne.mockImplementation(async ({ where }) =>
      'id' in where && typeof where.id === 'number' ? entity : null,
    );
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(entity, values);
    });

    const result = await service.update(
      1,
      {
        reportPeriod: '6 tháng cuối năm',
        startDate: '2026-07-01',
      },
      20,
    );

    expect(repository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        reportPeriod: '6 tháng cuối năm',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        updatedBy: 20,
      }),
    );
    expect(result.reportPeriod).toBe('6 tháng cuối năm');
  });

  it('updates status independently', async () => {
    const entity = makeReportPeriod();
    repository.findOne.mockResolvedValue(entity);
    repository.update.mockImplementation(async (_id, values) => {
      Object.assign(entity, values);
    });

    await expect(service.updateStatus(1, false, 20)).resolves.toMatchObject({
      isActive: false,
    });
    expect(repository.update).toHaveBeenCalledWith(1, {
      isActive: false,
      updatedBy: 20,
    });
  });

  it('rejects deleting an active report period', async () => {
    repository.findOne.mockResolvedValue(makeReportPeriod());

    await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes an inactive report period', async () => {
    repository.findOne.mockResolvedValue(makeReportPeriod({ isActive: false }));

    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith(1);
  });

  it('returns not found for a missing report period', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getById(999)).rejects.toThrow(NotFoundException);
  });
});
