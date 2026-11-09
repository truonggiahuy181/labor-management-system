import type { EntityManager } from 'typeorm';
import { BUSINESS_TYPE_CATALOG } from '../catalogs/business-type-catalog.js';

interface StoredBusinessTypeRow {
  type_code: string;
  type_name: string;
  is_active: boolean;
  deleted_at: Date | null;
}

export interface BusinessTypeSeedResult {
  totalCount: number;
}

export async function seedBusinessTypeCatalog(
  manager: Pick<EntityManager, 'query'>,
): Promise<BusinessTypeSeedResult> {
  const seedRows = BUSINESS_TYPE_CATALOG.map(([typeCode, typeName]) => ({
    type_code: typeCode,
    type_name: typeName,
  }));

  await manager.query(
    `
      INSERT INTO business_types (type_code, type_name, is_active, deleted_at)
      SELECT seed.type_code, seed.type_name, TRUE, NULL
      FROM jsonb_to_recordset($1::jsonb)
        AS seed(type_code VARCHAR(50), type_name VARCHAR(255))
      ON CONFLICT (type_code) DO UPDATE
      SET type_name = EXCLUDED.type_name,
          is_active = TRUE,
          deleted_at = NULL
    `,
    [JSON.stringify(seedRows)],
  );

  const storedRows = await manager.query<StoredBusinessTypeRow[]>(
    `
      SELECT type_code, type_name, is_active, deleted_at
      FROM business_types
      WHERE type_code = ANY($1::text[])
      ORDER BY type_code
    `,
    [seedRows.map((row) => row.type_code)],
  );

  const storedByCode = new Map(storedRows.map((row) => [row.type_code, row]));
  for (const expected of seedRows) {
    const stored = storedByCode.get(expected.type_code);
    if (
      !stored ||
      stored.type_name !== expected.type_name ||
      stored.is_active !== true ||
      stored.deleted_at !== null
    ) {
      throw new Error(
        `Business type seed verification failed for ${expected.type_code}.`,
      );
    }
  }

  if (storedRows.length !== seedRows.length) {
    throw new Error(
      `Business type seed verification failed: expected ${seedRows.length} rows, found ${storedRows.length}.`,
    );
  }

  return { totalCount: storedRows.length };
}
