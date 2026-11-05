import type { MigrationInterface, QueryRunner } from 'typeorm';
import { buildIndustrySeedRows } from '../catalogs/industry-catalog.js';

export class EnforceIndustryHierarchy1793610000000 implements MigrationInterface {
  name = 'EnforceIndustryHierarchy1793610000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Migration 017 applies the persisted level-one prefix. Migration 014 must
    // still use legacy numeric codes so it can repair rows created by migration
    // 001 before adding hierarchy constraints on a fresh database.
    const industryRows = buildIndustrySeedRows({ includeRootPrefix: false });

    await queryRunner.query(
      `
        INSERT INTO industries (
          industry_code,
          industry_name,
          level,
          parent_id,
          is_active,
          deleted_at
        )
        SELECT industry_code, industry_name, level, NULL, is_active, NULL
        FROM jsonb_to_recordset($1::jsonb)
          AS seed(
            industry_code VARCHAR(50),
            industry_name VARCHAR(255),
            parent_code VARCHAR(50),
            level INT,
            is_active BOOLEAN
          )
        ON CONFLICT (industry_code) DO UPDATE
        SET industry_name = EXCLUDED.industry_name,
            level = EXCLUDED.level,
            deleted_at = NULL
      `,
      [JSON.stringify(industryRows)],
    );

    await queryRunner.query(
      `
        UPDATE industries AS child
        SET parent_id = (
          SELECT parent.id
          FROM industries AS parent
          WHERE parent.industry_code = seed.parent_code
            AND parent.deleted_at IS NULL
        )
        FROM jsonb_to_recordset($1::jsonb)
          AS seed(industry_code VARCHAR(50), parent_code VARCHAR(50))
        WHERE child.industry_code = seed.industry_code
      `,
      [JSON.stringify(industryRows)],
    );

    await queryRunner.query(`
      ALTER TABLE industries
        DROP CONSTRAINT IF EXISTS fk_industries_parent;

      ALTER TABLE industries
        ADD CONSTRAINT fk_industries_parent
          FOREIGN KEY (parent_id) REFERENCES industries(id)
          ON DELETE RESTRICT,
        ADD CONSTRAINT chk_industries_level_range
          CHECK (level BETWEEN 1 AND 4),
        ADD CONSTRAINT chk_industries_parent_required
          CHECK (
            (level = 1 AND parent_id IS NULL)
            OR (level BETWEEN 2 AND 4 AND parent_id IS NOT NULL)
          ),
        ADD CONSTRAINT chk_industries_parent_not_self
          CHECK (parent_id IS NULL OR parent_id <> id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE industries
        DROP CONSTRAINT IF EXISTS chk_industries_parent_not_self,
        DROP CONSTRAINT IF EXISTS chk_industries_parent_required,
        DROP CONSTRAINT IF EXISTS chk_industries_level_range,
        DROP CONSTRAINT IF EXISTS fk_industries_parent;

      ALTER TABLE industries
        ADD CONSTRAINT fk_industries_parent
          FOREIGN KEY (parent_id) REFERENCES industries(id)
          ON DELETE SET NULL;
    `);
  }
}
