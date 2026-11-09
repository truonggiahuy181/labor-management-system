import { describe, expect, it, vi } from 'vitest';
import { seedBusinessTypeCatalog } from '../business-type-seed.js';

describe('seedBusinessTypeCatalog', () => {
  it('upserts and verifies all supported business types', async () => {
    const storedRows: Array<{
      type_code: string;
      type_name: string;
      is_active: boolean;
      deleted_at: null;
    }> = [];
    const manager = {
      query: vi.fn(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('INSERT INTO business_types')) {
          const rows = JSON.parse(parameters?.[0] as string) as Array<{
            type_code: string;
            type_name: string;
          }>;
          storedRows.push(
            ...rows.map((row) => ({
              ...row,
              is_active: true,
              deleted_at: null,
            })),
          );
          return [];
        }
        if (sql.includes('FROM business_types')) {
          return storedRows;
        }
        return [];
      }),
    };

    await expect(seedBusinessTypeCatalog(manager as any)).resolves.toEqual({
      totalCount: 5,
    });
    expect(storedRows).toEqual([
      expect.objectContaining({
        type_code: 'TNHH1',
        type_name: 'Công ty TNHH một thành viên',
      }),
      expect.objectContaining({
        type_code: 'TNHH2',
        type_name: 'Công ty TNHH hai thành viên trở lên',
      }),
      expect.objectContaining({
        type_code: 'CTCP',
        type_name: 'Công ty cổ phần',
      }),
      expect.objectContaining({
        type_code: 'HD',
        type_name: 'Công ty hợp danh',
      }),
      expect.objectContaining({
        type_code: 'DNTN',
        type_name: 'Doanh nghiệp tư nhân',
      }),
    ]);
  });
});
