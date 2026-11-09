import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { EntityManager } from 'typeorm';

interface LocationSnapshot {
  provinceCount: number;
  wardCount: number;
  provinces: Array<{
    code: string;
    name: string;
    divisionType: string;
  }>;
  wards: Array<{
    code: string;
    provinceCode: string;
    name: string;
    divisionType: string;
  }>;
}

export interface LocationSeedResult {
  provinceCount: number;
  wardCount: number;
}

const snapshotPath = fileURLToPath(
  new URL('../data/vietnam-locations-2025-07.json', import.meta.url),
);

export async function seedLocationCatalog(
  manager: Pick<EntityManager, 'query'>,
): Promise<LocationSeedResult> {
  const snapshot = JSON.parse(
    await readFile(snapshotPath, 'utf8'),
  ) as LocationSnapshot;

  if (
    snapshot.provinces.length !== snapshot.provinceCount ||
    snapshot.wards.length !== snapshot.wardCount ||
    snapshot.provinceCount !== 34 ||
    snapshot.wardCount !== 3321
  ) {
    throw new Error('Location snapshot count verification failed.');
  }

  await manager.query(
    `
      INSERT INTO provinces (code, name, division_type, is_active)
      SELECT seed.code, seed.name, seed.division_type, TRUE
      FROM jsonb_to_recordset($1::jsonb)
        AS seed(code VARCHAR(2), name VARCHAR(100), division_type VARCHAR(30))
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          division_type = EXCLUDED.division_type,
          is_active = TRUE
    `,
    [
      JSON.stringify(
        snapshot.provinces.map((province) => ({
          code: province.code,
          name: province.name,
          division_type: province.divisionType,
        })),
      ),
    ],
  );

  await manager.query(
    `
      INSERT INTO wards (code, province_code, name, division_type, is_active)
      SELECT
        seed.code,
        seed.province_code,
        seed.name,
        seed.division_type,
        TRUE
      FROM jsonb_to_recordset($1::jsonb)
        AS seed(
          code VARCHAR(5),
          province_code VARCHAR(2),
          name VARCHAR(100),
          division_type VARCHAR(30)
        )
      ON CONFLICT (code) DO UPDATE
      SET province_code = EXCLUDED.province_code,
          name = EXCLUDED.name,
          division_type = EXCLUDED.division_type,
          is_active = TRUE
    `,
    [
      JSON.stringify(
        snapshot.wards.map((ward) => ({
          code: ward.code,
          province_code: ward.provinceCode,
          name: ward.name,
          division_type: ward.divisionType,
        })),
      ),
    ],
  );

  const [counts] = await manager.query<
    Array<{ province_count: number; ward_count: number }>
  >(`
    SELECT
      (SELECT COUNT(*)::int FROM provinces WHERE is_active = TRUE)
        AS province_count,
      (SELECT COUNT(*)::int FROM wards WHERE is_active = TRUE)
        AS ward_count
  `);

  if (
    Number(counts?.province_count) !== snapshot.provinceCount ||
    Number(counts?.ward_count) !== snapshot.wardCount
  ) {
    throw new Error(
      `Location seed verification failed: expected ${snapshot.provinceCount} provinces and ${snapshot.wardCount} wards.`,
    );
  }

  return {
    provinceCount: snapshot.provinceCount,
    wardCount: snapshot.wardCount,
  };
}
