import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignEnterpriseWithSchema1792921770000 implements MigrationInterface {
  name = 'AlignEnterpriseWithSchema1792921770000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS business_types (
        id SERIAL PRIMARY KEY,
        type_code VARCHAR(50) NOT NULL,
        type_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_89816b980411fcf28091eebb9c"
        ON business_types (type_code);

      CREATE TABLE IF NOT EXISTS industries (
        id SERIAL PRIMARY KEY,
        industry_code VARCHAR(50) NOT NULL,
        industry_name VARCHAR(255) NOT NULL,
        level INT NOT NULL,
        parent_id INT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_a5f1789ac5745079968d31cd14"
        ON industries (industry_code);

      DO $migration$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_industries_parent'
            AND conrelid = 'industries'::regclass
        ) THEN
          ALTER TABLE industries
            ADD CONSTRAINT fk_industries_parent
            FOREIGN KEY (parent_id) REFERENCES industries(id)
            ON DELETE SET NULL;
        END IF;
      END
      $migration$;

      INSERT INTO business_types (type_code, type_name)
      VALUES ('TNHH1', 'Công ty TNHH một thành viên')
      ON CONFLICT (type_code) DO NOTHING;

      INSERT INTO industries (industry_code, industry_name, level)
      VALUES ('6201', 'Lập trình máy vi tính', 4)
      ON CONFLICT (industry_code) DO NOTHING;

      ALTER TABLE enterprises
        ADD COLUMN IF NOT EXISTS business_type_id INT,
        ADD COLUMN IF NOT EXISTS industry_id INT;

      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'enterprises'
            AND column_name = 'business_type'
        ) THEN
          EXECUTE $sql$
            INSERT INTO business_types (type_code, type_name)
            SELECT DISTINCT business_type, business_type
            FROM enterprises
            WHERE business_type IS NOT NULL
            ON CONFLICT (type_code) DO NOTHING
          $sql$;

          EXECUTE $sql$
            UPDATE enterprises enterprise
            SET business_type_id = business_type.id
            FROM business_types business_type
            WHERE business_type.type_code = enterprise.business_type
              AND enterprise.business_type_id IS NULL
          $sql$;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'enterprises'
            AND column_name = 'main_industry'
        ) THEN
          EXECUTE $sql$
            INSERT INTO industries (industry_code, industry_name, level)
            SELECT DISTINCT main_industry, main_industry, 4
            FROM enterprises
            WHERE main_industry IS NOT NULL
            ON CONFLICT (industry_code) DO NOTHING
          $sql$;

          EXECUTE $sql$
            UPDATE enterprises enterprise
            SET industry_id = industry.id
            FROM industries industry
            WHERE industry.industry_code = enterprise.main_industry
              AND enterprise.industry_id IS NULL
          $sql$;
        END IF;
      END
      $migration$;

      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'company_name'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'enterprise_name'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN company_name TO enterprise_name;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'license_date'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'registration_date'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN license_date TO registration_date;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'province'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'province_id'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN province TO province_id;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'ward'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'ward_id'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN ward TO ward_id;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'office_phone'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'phone_number'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN office_phone TO phone_number;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'operating_province'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'op_province_id'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN operating_province TO op_province_id;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'operating_ward'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'op_ward_id'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN operating_ward TO op_ward_id;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'business_location'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'op_address'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN business_location TO op_address;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'leader_name'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'representative_name'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN leader_name TO representative_name;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'leader_phone'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'enterprises'
            AND column_name = 'representative_phone'
        ) THEN
          ALTER TABLE enterprises RENAME COLUMN leader_phone TO representative_phone;
        END IF;
      END
      $migration$;

      ALTER TABLE enterprises
        ALTER COLUMN tax_code TYPE VARCHAR(50),
        ALTER COLUMN enterprise_name TYPE VARCHAR(255),
        ALTER COLUMN foreign_name TYPE VARCHAR(255),
        ALTER COLUMN email TYPE VARCHAR(100),
        ALTER COLUMN phone_number TYPE VARCHAR(20),
        ALTER COLUMN province_id TYPE VARCHAR(20),
        ALTER COLUMN ward_id TYPE VARCHAR(20),
        ALTER COLUMN address TYPE VARCHAR(255),
        ALTER COLUMN op_province_id TYPE VARCHAR(20),
        ALTER COLUMN op_ward_id TYPE VARCHAR(20),
        ALTER COLUMN op_address TYPE VARCHAR(255),
        ALTER COLUMN representative_name TYPE VARCHAR(100),
        ALTER COLUMN representative_phone TYPE VARCHAR(20),
        ALTER COLUMN business_type_id SET NOT NULL,
        ALTER COLUMN industry_id SET NOT NULL;

      ALTER TABLE enterprises
        DROP COLUMN IF EXISTS business_type,
        DROP COLUMN IF EXISTS main_industry,
        DROP COLUMN IF EXISTS business_license_path,
        DROP COLUMN IF EXISTS other_document_path;

      DO $migration$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_enterprises_business_type'
            AND conrelid = 'enterprises'::regclass
        ) THEN
          ALTER TABLE enterprises
            ADD CONSTRAINT fk_enterprises_business_type
            FOREIGN KEY (business_type_id) REFERENCES business_types(id)
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_enterprises_industry'
            AND conrelid = 'enterprises'::regclass
        ) THEN
          ALTER TABLE enterprises
            ADD CONSTRAINT fk_enterprises_industry
            FOREIGN KEY (industry_id) REFERENCES industries(id)
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_users_enterprise'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT fk_users_enterprise
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
            ON DELETE SET NULL;
        END IF;
      END
      $migration$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_enterprise;
      ALTER TABLE enterprises
        DROP CONSTRAINT IF EXISTS fk_enterprises_business_type,
        DROP CONSTRAINT IF EXISTS fk_enterprises_industry;

      ALTER TABLE enterprises
        ADD COLUMN IF NOT EXISTS business_type VARCHAR,
        ADD COLUMN IF NOT EXISTS main_industry VARCHAR,
        ADD COLUMN IF NOT EXISTS business_license_path VARCHAR NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS other_document_path VARCHAR NULL;

      UPDATE enterprises enterprise
      SET business_type = business_type.type_code
      FROM business_types business_type
      WHERE business_type.id = enterprise.business_type_id;

      UPDATE enterprises enterprise
      SET main_industry = industry.industry_code
      FROM industries industry
      WHERE industry.id = enterprise.industry_id;

      ALTER TABLE enterprises
        ALTER COLUMN business_type SET NOT NULL,
        ALTER COLUMN main_industry SET NOT NULL,
        ALTER COLUMN business_license_path DROP DEFAULT,
        DROP COLUMN business_type_id,
        DROP COLUMN industry_id;

      ALTER TABLE enterprises RENAME COLUMN enterprise_name TO company_name;
      ALTER TABLE enterprises RENAME COLUMN registration_date TO license_date;
      ALTER TABLE enterprises RENAME COLUMN province_id TO province;
      ALTER TABLE enterprises RENAME COLUMN ward_id TO ward;
      ALTER TABLE enterprises RENAME COLUMN phone_number TO office_phone;
      ALTER TABLE enterprises RENAME COLUMN op_province_id TO operating_province;
      ALTER TABLE enterprises RENAME COLUMN op_ward_id TO operating_ward;
      ALTER TABLE enterprises RENAME COLUMN op_address TO business_location;
      ALTER TABLE enterprises RENAME COLUMN representative_name TO leader_name;
      ALTER TABLE enterprises RENAME COLUMN representative_phone TO leader_phone;

      DROP TABLE industries;
      DROP TABLE business_types;
    `);
  }
}
