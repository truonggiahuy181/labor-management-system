import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateReportReviewFlagsDto } from '../dto/update-report-review-flags.dto.js';
import { AdminOccupationalAccidentReportQueryDto } from '../dto/admin-occupational-accident-report-query.dto.js';
import { CreateReportReviewLabelDto } from '../dto/create-report-review-label.dto.js';

describe('review flag validation', () => {
  const valid = {
    flags: ['MISSING_WORKFORCE', 'MISSING_SIGNATURE'],
    note: '  Nội bộ  ',
    version: 3,
  };
  it('accepts multiple labels, trims internal notes and supports removing labels', () => {
    const dto = plainToInstance(UpdateReportReviewFlagsDto, valid);
    expect(validateSync(dto)).toEqual([]);
    expect(dto.note).toBe('Nội bộ');
    expect(
      validateSync(
        plainToInstance(UpdateReportReviewFlagsDto, {
          ...valid,
          flags: [],
          note: '',
        }),
      ),
    ).toEqual([]);
  });
  it('accepts stable custom label codes without requiring internal notes', () => {
    const value = `CUSTOM_${'A'.repeat(32)}`;
    expect(
      validateSync(
        plainToInstance(UpdateReportReviewFlagsDto, {
          flags: [value],
          version: 1,
        }),
      ),
    ).toEqual([]);
    expect(
      validateSync(
        plainToInstance(AdminOccupationalAccidentReportQueryDto, {
          reviewFlag: value,
        }),
      ),
    ).toEqual([]);
  });
  it('normalizes custom names and rejects blank, excessive or invalid names', () => {
    const dto = plainToInstance(CreateReportReviewLabelDto, {
      label: '  Thiếu   số liệu quý III  ',
    });
    expect(dto.label).toBe('Thiếu số liệu quý III');
    expect(validateSync(dto)).toEqual([]);
    for (const label of ['', ' ', 'a', 'x'.repeat(101), null, 5, 'A\u0000B']) {
      expect(
        validateSync(plainToInstance(CreateReportReviewLabelDto, { label }))
          .length,
      ).toBeGreaterThan(0);
    }
  });
  it.each([
    { flags: ['UNKNOWN'] },
    { flags: ['MISSING_WORKFORCE', 'MISSING_WORKFORCE'] },
    { flags: 'MISSING_WORKFORCE' },
    { flags: null },
    {
      flags: Array.from(
        { length: 21 },
        (_, index) =>
          `CUSTOM_${index.toString(16).padStart(32, '0').toUpperCase()}`,
      ),
    },
    { note: 'x'.repeat(501) },
    { version: 0 },
    { version: 1.5 },
    { version: '3' },
    { version: undefined },
  ])('rejects invalid review metadata: %j', (patch) => {
    expect(
      validateSync(
        plainToInstance(UpdateReportReviewFlagsDto, { ...valid, ...patch }),
      ).length,
    ).toBeGreaterThan(0);
  });
  it('validates flag filters instead of accepting arbitrary query values', () => {
    for (const reviewFlag of [
      'flagged',
      'unflagged',
      'MISSING_WORKFORCE',
      'MISSING_SIGNATURE',
      'INCONSISTENT_DATA',
    ]) {
      expect(
        validateSync(
          plainToInstance(AdminOccupationalAccidentReportQueryDto, {
            reviewFlag,
          }),
        ),
      ).toEqual([]);
    }
    expect(
      validateSync(
        plainToInstance(AdminOccupationalAccidentReportQueryDto, {
          reviewFlag: 'unknown',
        }),
      ).length,
    ).toBeGreaterThan(0);
  });
});
