import { describe, expect, it } from 'vitest';
import { buildIndustrySeedRows } from './industry-catalog.js';

describe('industry catalog', () => {
  it('keeps official codes through level four and filters level five', () => {
    const rows = buildIndustrySeedRows();

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          industry_code: 'A',
          parent_code: null,
          level: 1,
        }),
        expect.objectContaining({
          industry_code: '01',
          parent_code: 'A',
          level: 2,
        }),
        expect.objectContaining({
          industry_code: '011',
          parent_code: '01',
          level: 3,
        }),
        expect.objectContaining({
          industry_code: '0111',
          parent_code: '011',
          level: 4,
        }),
      ]),
    );
    expect(rows.some((row) => row.industry_code === '01110')).toBe(false);
    expect(rows.every((row) => row.level >= 1 && row.level <= 4)).toBe(true);
    expect(
      rows.some((row) => row.level > 1 && /^[A-V]/.test(row.industry_code)),
    ).toBe(false);
  });
});
