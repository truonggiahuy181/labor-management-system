import type { EntityManager } from 'typeorm';
import {
  OCCUPATION_CATALOG,
  type OccupationSeedRow,
} from '../catalogs/occupation-catalog.js';

interface StoredOccupationRow {
  occupation_code: string;
  occupation_name: string;
  parent_code: string | null;
  level: number;
  is_active: boolean;
}

export interface OccupationSeedResult {
  totalCount: number;
  levelCounts: Record<number, number>;
}

export async function seedOccupationCatalog(
  manager: Pick<EntityManager, 'query'>,
): Promise<OccupationSeedResult> {
  for (const level of [1, 2, 3, 4] as const) {
    const rows = OCCUPATION_CATALOG.filter((row) => row.level === level);
    await manager.query(
      `
        INSERT INTO occupations (
          occupation_code,
          occupation_name,
          level,
          parent_id,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          seed.occupation_code,
          seed.occupation_name,
          seed.level,
          parent.id,
          seed.is_active,
          NULL,
          NULL,
          NOW(),
          NOW()
        FROM jsonb_to_recordset($1::jsonb)
          AS seed(
            occupation_code VARCHAR(4),
            occupation_name VARCHAR(255),
            parent_code VARCHAR(4),
            level SMALLINT,
            is_active BOOLEAN
          )
        LEFT JOIN occupations parent
          ON parent.occupation_code = seed.parent_code
          AND parent.deleted_at IS NULL
        ON CONFLICT (occupation_code) DO UPDATE
        SET occupation_name = EXCLUDED.occupation_name,
            level = EXCLUDED.level,
            parent_id = EXCLUDED.parent_id,
            is_active = EXCLUDED.is_active,
            deleted_at = NULL,
            updated_at = NOW()
      `,
      [JSON.stringify(rows.map(toStoredSeedRow))],
    );
  }

  const storedRows = await manager.query<StoredOccupationRow[]>(
    `
      SELECT
        occupation.occupation_code,
        occupation.occupation_name,
        parent.occupation_code AS parent_code,
        occupation.level::int AS level,
        occupation.is_active
      FROM occupations AS occupation
      LEFT JOIN occupations AS parent ON parent.id = occupation.parent_id
      WHERE occupation.occupation_code = ANY($1::text[])
        AND occupation.deleted_at IS NULL
      ORDER BY occupation.level, occupation.occupation_code
    `,
    [OCCUPATION_CATALOG.map((row) => row.occupationCode)],
  );

  assertStoredOccupationCatalog(OCCUPATION_CATALOG, storedRows);
  const levelCounts = Object.fromEntries(
    [1, 2, 3, 4].map((level) => [
      level,
      storedRows.filter((row) => Number(row.level) === level).length,
    ]),
  );
  return { totalCount: storedRows.length, levelCounts };
}

function toStoredSeedRow(row: OccupationSeedRow) {
  return {
    occupation_code: row.occupationCode,
    occupation_name: row.occupationName,
    parent_code: row.parentCode,
    level: row.level,
    is_active: row.isActive,
  };
}

function assertStoredOccupationCatalog(
  expectedRows: readonly OccupationSeedRow[],
  storedRows: StoredOccupationRow[],
): void {
  const storedByCode = new Map(
    storedRows.map((row) => [row.occupation_code, row]),
  );

  for (const expected of expectedRows) {
    const stored = storedByCode.get(expected.occupationCode);
    if (
      !stored ||
      stored.occupation_name !== expected.occupationName ||
      stored.parent_code !== expected.parentCode ||
      Number(stored.level) !== expected.level ||
      stored.is_active !== expected.isActive
    ) {
      throw new Error(
        `Occupation seed verification failed for ${expected.occupationCode}.`,
      );
    }
  }

  if (storedRows.length !== expectedRows.length) {
    throw new Error(
      `Occupation seed verification failed: expected ${expectedRows.length} rows, found ${storedRows.length}.`,
    );
  }
}
