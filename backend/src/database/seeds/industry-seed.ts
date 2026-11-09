import type { EntityManager } from 'typeorm';
import {
  buildIndustrySeedRows,
  type IndustrySeedRow,
} from '../catalogs/industry-catalog.js';

export interface IndustrySeedResult {
  totalCount: number;
  levelCounts: Record<number, number>;
  migratedEnterpriseCount: number;
  retiredLegacyCount: number;
}

interface StoredIndustryRow {
  industry_code: string;
  industry_name: string;
  parent_code: string | null;
  level: number;
  is_active: boolean;
}

const LEGACY_INDUSTRY_CODE_MAPPINGS = [
  { legacy_code: '2610', target_code: '2619' },
  { legacy_code: '3100', target_code: '3101' },
  { legacy_code: '6201', target_code: '6219' },
  { legacy_code: '6202', target_code: '6220' },
  { legacy_code: '6209', target_code: '6290' },
  { legacy_code: '6311', target_code: '6310' },
  { legacy_code: '6312', target_code: '6390' },
] as const;

const LEGACY_INDUSTRY_CODES = [
  '620',
  ...LEGACY_INDUSTRY_CODE_MAPPINGS.map(({ legacy_code }) => legacy_code),
];

export async function seedIndustryCatalog(
  manager: Pick<EntityManager, 'query'>,
): Promise<IndustrySeedResult> {
  const industryRows = buildIndustrySeedRows();

  for (let level = 1; level <= 4; level += 1) {
    const rowsAtLevel = industryRows.filter((row) => row.level === level);
    await manager.query(
      `
        INSERT INTO industries (
          industry_code,
          industry_name,
          level,
          parent_id,
          is_active,
          deleted_at
        )
        SELECT
          seed.industry_code,
          seed.industry_name,
          seed.level,
          parent.id,
          seed.is_active,
          NULL
        FROM jsonb_to_recordset($1::jsonb)
          AS seed(
            industry_code VARCHAR(50),
            industry_name VARCHAR(255),
            parent_code VARCHAR(50),
            level INT,
            is_active BOOLEAN
          )
        LEFT JOIN industries AS parent
          ON parent.industry_code = seed.parent_code
          AND parent.deleted_at IS NULL
        ON CONFLICT (industry_code) DO UPDATE
        SET industry_name = EXCLUDED.industry_name,
            level = EXCLUDED.level,
            parent_id = EXCLUDED.parent_id,
            is_active = EXCLUDED.is_active,
            deleted_at = NULL
      `,
      [JSON.stringify(rowsAtLevel)],
    );
  }

  const [migratedEnterpriseCountRow] = await manager.query<
    Array<{ count: number }>
  >(
    `
      WITH
        mapping AS (
          SELECT legacy_code, target_code
          FROM jsonb_to_recordset($1::jsonb)
            AS seed(legacy_code VARCHAR(4), target_code VARCHAR(4))
        ),
        migrated AS (
          UPDATE enterprises AS enterprise
          SET industry_id = target.id,
              updated_at = NOW()
          FROM mapping
          INNER JOIN industries AS legacy
            ON legacy.industry_code = mapping.legacy_code
          INNER JOIN industries AS target
            ON target.industry_code = mapping.target_code
            AND target.deleted_at IS NULL
          WHERE enterprise.industry_id = legacy.id
          RETURNING enterprise.id
        )
      SELECT COUNT(*)::int AS count FROM migrated
    `,
    [JSON.stringify(LEGACY_INDUSTRY_CODE_MAPPINGS)],
  );

  const [retiredLegacyCountRow] = await manager.query<Array<{ count: number }>>(
    `
      WITH retired AS (
        UPDATE industries
        SET is_active = FALSE,
            deleted_at = COALESCE(deleted_at, NOW())
        WHERE industry_code = ANY($1::text[])
          AND deleted_at IS NULL
        RETURNING industry_code
      )
      SELECT COUNT(*)::int AS count FROM retired
    `,
    [LEGACY_INDUSTRY_CODES],
  );

  const storedRows = await manager.query<StoredIndustryRow[]>(
    `
      SELECT
        industry.industry_code,
        industry.industry_name,
        parent.industry_code AS parent_code,
        industry.level::int AS level,
        industry.is_active
      FROM industries AS industry
      LEFT JOIN industries AS parent ON parent.id = industry.parent_id
      WHERE industry.industry_code = ANY($1::text[])
        AND industry.deleted_at IS NULL
      ORDER BY industry.level, industry.industry_code
    `,
    [industryRows.map((row) => row.industry_code)],
  );

  assertStoredIndustryCatalog(industryRows, storedRows);

  const levelCounts = Object.fromEntries(
    [1, 2, 3, 4].map((level) => [
      level,
      storedRows.filter((row) => Number(row.level) === level).length,
    ]),
  );

  return {
    totalCount: storedRows.length,
    levelCounts,
    migratedEnterpriseCount: Number(migratedEnterpriseCountRow?.count ?? 0),
    retiredLegacyCount: Number(retiredLegacyCountRow?.count ?? 0),
  };
}

function assertStoredIndustryCatalog(
  expectedRows: IndustrySeedRow[],
  storedRows: StoredIndustryRow[],
): void {
  const storedByCode = new Map(
    storedRows.map((row) => [row.industry_code, row]),
  );

  for (const expected of expectedRows) {
    const stored = storedByCode.get(expected.industry_code);
    if (!stored) {
      throw new Error(
        `Industry seed verification failed: missing ${expected.industry_code}.`,
      );
    }
    if (
      stored.industry_name !== expected.industry_name ||
      Number(stored.level) !== expected.level ||
      stored.parent_code !== expected.parent_code ||
      stored.is_active !== expected.is_active
    ) {
      throw new Error(
        `Industry seed verification failed for ${expected.industry_code}.`,
      );
    }
  }

  if (storedRows.length !== expectedRows.length) {
    throw new Error(
      `Industry seed verification failed: expected ${expectedRows.length} rows, found ${storedRows.length}.`,
    );
  }
}
