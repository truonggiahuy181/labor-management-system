import { describe, expect, it } from 'vitest';
import { OCCUPATION_CATALOG } from './occupation-catalog.js';

describe('occupation catalog', () => {
  it('contains the normalized four-level catalog with valid parents', () => {
    expect(OCCUPATION_CATALOG).toHaveLength(717);
    expect(
      Object.fromEntries(
        [1, 2, 3, 4].map((level) => [
          level,
          OCCUPATION_CATALOG.filter((row) => row.level === level).length,
        ]),
      ),
    ).toEqual({ 1: 10, 2: 48, 3: 152, 4: 507 });
    expect(OCCUPATION_CATALOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          occupationCode: '0',
          parentCode: null,
          level: 1,
        }),
        expect.objectContaining({
          occupationCode: '01',
          parentCode: '0',
          level: 2,
        }),
        expect.objectContaining({
          occupationCode: '011',
          parentCode: '01',
          level: 3,
        }),
        expect.objectContaining({
          occupationCode: '0110',
          occupationName: 'Sĩ quan',
          parentCode: '011',
          level: 4,
        }),
      ]),
    );
  });
});
