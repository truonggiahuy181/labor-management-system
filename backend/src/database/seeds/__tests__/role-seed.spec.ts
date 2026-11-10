import { describe, expect, it, vi } from 'vitest';
import { seedSystemRoles } from '../role-seed.js';

describe('seedSystemRoles', () => {
  it('upserts and verifies the required system roles', async () => {
    const storedRows: Array<{
      role_code: string;
      role_name: string;
      is_active: boolean;
      deleted_at: null;
    }> = [];
    const manager = {
      query: vi.fn(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('INSERT INTO roles')) {
          const rows = JSON.parse(parameters?.[0] as string) as Array<{
            role_code: string;
            role_name: string;
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
        if (sql.includes('FROM roles')) return storedRows;
        return [];
      }),
    };

    await expect(seedSystemRoles(manager as never)).resolves.toEqual({
      totalCount: 2,
    });
    expect(storedRows.map((row) => row.role_code)).toEqual([
      'ADMIN',
      'ENTERPRISE_USER',
    ]);
  });
});
