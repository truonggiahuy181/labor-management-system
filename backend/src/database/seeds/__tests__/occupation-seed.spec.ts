import { describe, expect, it, vi } from 'vitest';
import { seedOccupationCatalog } from '../occupation-seed.js';

describe('seedOccupationCatalog', () => {
  it('upserts and verifies all four occupation levels', async () => {
    const storedRows: Array<{
      occupation_code: string;
      occupation_name: string;
      parent_code: string | null;
      level: number;
      is_active: boolean;
    }> = [];
    const manager = {
      query: vi.fn(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('INSERT INTO occupations')) {
          storedRows.push(...JSON.parse(parameters?.[0] as string));
          return [];
        }
        if (sql.includes('FROM occupations AS occupation')) {
          return storedRows;
        }
        return [];
      }),
    };

    await expect(seedOccupationCatalog(manager as any)).resolves.toEqual({
      totalCount: 717,
      levelCounts: { 1: 10, 2: 48, 3: 152, 4: 507 },
    });
    expect(manager.query).toHaveBeenCalledTimes(5);
    expect(storedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          occupation_code: '0',
          parent_code: null,
          level: 1,
        }),
        expect.objectContaining({
          occupation_code: '0110',
          occupation_name: 'Sĩ quan',
          parent_code: '011',
          level: 4,
        }),
        expect.objectContaining({
          occupation_code: '9629',
          parent_code: '962',
          level: 4,
          is_active: true,
        }),
      ]),
    );
  });
});
