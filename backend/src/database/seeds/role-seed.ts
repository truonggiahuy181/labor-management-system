import type { EntityManager } from 'typeorm';
import { SYSTEM_ROLE_CATALOG } from '../catalogs/system-role-catalog.js';

interface StoredRoleRow {
  role_code: string;
  role_name: string;
  is_active: boolean;
  deleted_at: Date | null;
}

export interface RoleSeedResult {
  totalCount: number;
}

export async function seedSystemRoles(
  manager: Pick<EntityManager, 'query'>,
): Promise<RoleSeedResult> {
  const seedRows = SYSTEM_ROLE_CATALOG.map(([roleCode, roleName]) => ({
    role_code: roleCode,
    role_name: roleName,
  }));

  await manager.query(
    `
      INSERT INTO roles (role_code, role_name, is_active, deleted_at)
      SELECT seed.role_code, seed.role_name, TRUE, NULL
      FROM jsonb_to_recordset($1::jsonb)
        AS seed(role_code VARCHAR(50), role_name VARCHAR(100))
      ON CONFLICT (role_code) DO UPDATE
      SET role_name = EXCLUDED.role_name,
          is_active = TRUE,
          deleted_at = NULL
    `,
    [JSON.stringify(seedRows)],
  );

  const storedRows = await manager.query<StoredRoleRow[]>(
    `
      SELECT role_code, role_name, is_active, deleted_at
      FROM roles
      WHERE role_code = ANY($1::text[])
      ORDER BY role_code
    `,
    [seedRows.map((row) => row.role_code)],
  );

  const storedByCode = new Map(storedRows.map((row) => [row.role_code, row]));
  for (const expected of seedRows) {
    const stored = storedByCode.get(expected.role_code);
    if (
      !stored ||
      stored.role_name !== expected.role_name ||
      stored.is_active !== true ||
      stored.deleted_at !== null
    ) {
      throw new Error(`System role seed verification failed for ${expected.role_code}.`);
    }
  }

  if (storedRows.length !== seedRows.length) {
    throw new Error(
      `System role seed verification failed: expected ${seedRows.length} rows, found ${storedRows.length}.`,
    );
  }

  return { totalCount: storedRows.length };
}
