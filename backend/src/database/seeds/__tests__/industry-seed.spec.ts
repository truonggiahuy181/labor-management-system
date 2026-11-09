import { describe, expect, it, vi } from 'vitest';
import { seedIndustryCatalog } from '../industry-seed.js';

describe('seedIndustryCatalog', () => {
  it('upserts the full catalog, migrates references, and retires legacy codes', async () => {
    const seededRows: Array<{
      industry_code: string;
      industry_name: string;
      parent_code: string | null;
      level: number;
      is_active: boolean;
    }> = [];
    const query = vi.fn(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes('INSERT INTO industries')) {
        seededRows.push(...JSON.parse(parameters?.[0] as string));
        return [];
      }
      if (sql.includes('SELECT COUNT(*)::int AS count FROM migrated')) {
        return [{ count: 2 }];
      }
      if (sql.includes('SELECT COUNT(*)::int AS count FROM retired')) {
        return [{ count: 8 }];
      }
      if (
        sql.includes('FROM industries AS industry') &&
        sql.includes('parent.industry_code AS parent_code')
      ) {
        return seededRows;
      }
      return [];
    });

    const result = await seedIndustryCatalog({ query } as any);

    expect(result).toEqual({
      totalCount: 863,
      levelCounts: { 1: 22, 2: 87, 3: 259, 4: 495 },
      migratedEnterpriseCount: 2,
      retiredLegacyCount: 8,
    });
    expect(
      query.mock.calls.filter(([sql]) =>
        (sql as string).includes('INSERT INTO industries'),
      ),
    ).toHaveLength(4);
    expect(
      query.mock.calls.find(([sql]) =>
        (sql as string).includes('INSERT INTO industries'),
      )?.[0],
    ).toContain('is_active = EXCLUDED.is_active');
  });
});
