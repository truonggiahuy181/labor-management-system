import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { MigrationInterface, QueryRunner } from 'typeorm';

interface LocationCatalog {
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

export class CreateLocationCatalog1793264400000 implements MigrationInterface {
  name = 'CreateLocationCatalog1793264400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const catalog = await this.readCatalog();

    await queryRunner.query(`
      CREATE TABLE provinces (
        code VARCHAR(2) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        division_type VARCHAR(30) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT ck_provinces_code_format CHECK (code ~ '^[0-9]{2}$')
      );

      CREATE TABLE wards (
        code VARCHAR(5) PRIMARY KEY,
        province_code VARCHAR(2) NOT NULL,
        name VARCHAR(100) NOT NULL,
        division_type VARCHAR(30) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT ck_wards_code_format CHECK (code ~ '^[0-9]{5}$'),
        CONSTRAINT fk_wards_province
          FOREIGN KEY (province_code) REFERENCES provinces(code) ON DELETE RESTRICT,
        CONSTRAINT uq_wards_code_province_code UNIQUE (code, province_code)
      );

      CREATE INDEX idx_wards_province_code ON wards(province_code);
    `);

    await queryRunner.query(
      `
        INSERT INTO provinces (code, name, division_type)
        SELECT code, name, "divisionType"
        FROM jsonb_to_recordset($1::jsonb)
          AS data(code VARCHAR(2), name VARCHAR(100), "divisionType" VARCHAR(30));
      `,
      [JSON.stringify(catalog.provinces)],
    );

    await queryRunner.query(
      `
        INSERT INTO wards (code, province_code, name, division_type)
        SELECT code, "provinceCode", name, "divisionType"
        FROM jsonb_to_recordset($1::jsonb)
          AS data(
            code VARCHAR(5),
            "provinceCode" VARCHAR(2),
            name VARCHAR(100),
            "divisionType" VARCHAR(30)
          );
      `,
      [JSON.stringify(catalog.wards)],
    );

    // Existing rows can still contain codes from the pre-July-2025 catalog.
    // NOT VALID preserves those rows while enforcing the new catalog for all
    // subsequent inserts and updates of the location columns.
    await queryRunner.query(`
      ALTER TABLE users
        ADD CONSTRAINT fk_users_province
          FOREIGN KEY (province_id) REFERENCES provinces(code) NOT VALID,
        ADD CONSTRAINT fk_users_ward
          FOREIGN KEY (ward_id) REFERENCES wards(code) NOT VALID,
        ADD CONSTRAINT fk_users_ward_province
          FOREIGN KEY (ward_id, province_id)
          REFERENCES wards(code, province_code) NOT VALID;

      ALTER TABLE enterprises
        ADD CONSTRAINT fk_enterprises_province
          FOREIGN KEY (province_id) REFERENCES provinces(code) NOT VALID,
        ADD CONSTRAINT fk_enterprises_ward
          FOREIGN KEY (ward_id) REFERENCES wards(code) NOT VALID,
        ADD CONSTRAINT fk_enterprises_ward_province
          FOREIGN KEY (ward_id, province_id)
          REFERENCES wards(code, province_code) NOT VALID,
        ADD CONSTRAINT fk_enterprises_operating_province
          FOREIGN KEY (op_province_id) REFERENCES provinces(code) NOT VALID,
        ADD CONSTRAINT fk_enterprises_operating_ward
          FOREIGN KEY (op_ward_id) REFERENCES wards(code) NOT VALID,
        ADD CONSTRAINT fk_enterprises_operating_ward_province
          FOREIGN KEY (op_ward_id, op_province_id)
          REFERENCES wards(code, province_code) NOT VALID;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enterprises
        DROP CONSTRAINT IF EXISTS fk_enterprises_operating_ward_province,
        DROP CONSTRAINT IF EXISTS fk_enterprises_operating_ward,
        DROP CONSTRAINT IF EXISTS fk_enterprises_operating_province,
        DROP CONSTRAINT IF EXISTS fk_enterprises_ward_province,
        DROP CONSTRAINT IF EXISTS fk_enterprises_ward,
        DROP CONSTRAINT IF EXISTS fk_enterprises_province;

      ALTER TABLE users
        DROP CONSTRAINT IF EXISTS fk_users_ward_province,
        DROP CONSTRAINT IF EXISTS fk_users_ward,
        DROP CONSTRAINT IF EXISTS fk_users_province;

      DROP TABLE wards;
      DROP TABLE provinces;
    `);
  }

  private async readCatalog(): Promise<LocationCatalog> {
    const catalogPath = fileURLToPath(
      new URL('../data/vietnam-locations-2025-07.json', import.meta.url),
    );
    const catalog = JSON.parse(
      await readFile(catalogPath, 'utf8'),
    ) as LocationCatalog;

    if (
      catalog.provinceCount !== 34 ||
      catalog.provinces.length !== 34 ||
      catalog.wardCount !== 3321 ||
      catalog.wards.length !== 3321
    ) {
      throw new Error(
        'Location catalog must contain exactly 34 provinces and 3321 wards.',
      );
    }

    return catalog;
  }
}
