import { describe, expect, it } from 'vitest';
import { BUSINESS_TYPE_CATALOG } from './business-type-catalog.js';

describe('business type catalog', () => {
  it('contains the five supported business types without duplicate codes', () => {
    expect(BUSINESS_TYPE_CATALOG).toEqual([
      ['TNHH1', 'Công ty TNHH một thành viên'],
      ['TNHH2', 'Công ty TNHH hai thành viên trở lên'],
      ['CTCP', 'Công ty cổ phần'],
      ['HD', 'Công ty hợp danh'],
      ['DNTN', 'Doanh nghiệp tư nhân'],
    ]);
    expect(new Set(BUSINESS_TYPE_CATALOG.map(([code]) => code)).size).toBe(
      BUSINESS_TYPE_CATALOG.length,
    );
  });
});
