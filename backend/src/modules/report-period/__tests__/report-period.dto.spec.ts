import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateReportPeriodDto } from '../dto/create-report-period.dto.js';
import { ReportPeriodQueryDto } from '../dto/report-period-query.dto.js';

const createDto = (overrides: Record<string, unknown> = {}) =>
  plainToInstance(CreateReportPeriodDto, {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2026,
    reportTypeCode: 'OCCUPATIONAL_ACCIDENT',
    periodCode: 'ANNUAL',
    submissionStartDate: '2027-01-01',
    submissionEndDate: '2027-01-09',
    ...overrides,
  });

describe('CreateReportPeriodDto', () => {
  it('accepts an explicit report definition', async () => {
    await expect(validate(createDto())).resolves.toHaveLength(0);
  });

  it.each([1999, 2101])('rejects report year %s', async (reportYear) => {
    const errors = await validate(createDto({ reportYear }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'reportYear' }),
      ]),
    );
  });

  it('only accepts date-only values', async () => {
    const errors = await validate(
      createDto({ submissionStartDate: '2027-01-01T10:00:00.000Z' }),
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'submissionStartDate' }),
      ]),
    );
  });

  it('rejects names longer than the database column', async () => {
    const errors = await validate(createDto({ reportName: 'a'.repeat(256) }));
    expect(errors.map((error) => error.property)).toContain('reportName');
  });

  it('rejects a report name containing only whitespace', async () => {
    const errors = await validate(createDto({ reportName: '   ' }));

    expect(errors.map((error) => error.property)).toContain('reportName');
  });
});

describe('ReportPeriodQueryDto', () => {
  it('transforms year and boolean query parameters', async () => {
    const dto = plainToInstance(ReportPeriodQueryDto, {
      reportYear: '2026',
      isActive: 'false',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.reportYear).toBe(2026);
    expect(dto.isActive).toBe(false);
  });
});
