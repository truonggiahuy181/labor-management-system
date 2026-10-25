import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline for databases that were originally created with synchronize=true.
 * CREATE TABLE IF NOT EXISTS lets an existing legacy database adopt the
 * migration history while also allowing a brand-new database to start empty.
 */
export class InitialLegacySchema1792921769000 implements MigrationInterface {
  name = 'InitialLegacySchema1792921769000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS enterprises (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        company_name VARCHAR NOT NULL,
        tax_code VARCHAR NOT NULL,
        business_type VARCHAR NOT NULL,
        main_industry VARCHAR NOT NULL,
        license_date DATE NOT NULL,
        province VARCHAR NOT NULL,
        ward VARCHAR NOT NULL,
        address VARCHAR NOT NULL,
        foreign_name VARCHAR NULL,
        email VARCHAR NOT NULL,
        office_phone VARCHAR NULL,
        leader_name VARCHAR NULL,
        leader_phone VARCHAR NULL,
        operating_province VARCHAR NULL,
        operating_ward VARCHAR NULL,
        business_location VARCHAR NULL,
        business_license_path VARCHAR NOT NULL,
        other_document_path VARCHAR NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        username VARCHAR NOT NULL,
        password_hash VARCHAR NOT NULL,
        full_name VARCHAR NOT NULL,
        dob DATE NULL,
        gender SMALLINT NULL,
        email VARCHAR NULL,
        phone_number VARCHAR NULL,
        title VARCHAR NULL,
        avatar_url VARCHAR NULL,
        province_id VARCHAR NULL,
        district_id VARCHAR NULL,
        ward_id VARCHAR NULL,
        address VARCHAR NULL,
        role_id INT NOT NULL,
        enterprise_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        reset_password_token VARCHAR NULL,
        reset_password_expires TIMESTAMP NULL,
        password_changed_at TIMESTAMP NULL,
        email_change_otp VARCHAR NULL,
        email_change_otp_expires TIMESTAMP NULL,
        email_change_pending VARCHAR NULL
      );

      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'users'
            AND column_name = 'deleted_at'
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS "IDX_4a2fee81e0371b27e68c0fad6a"
            ON users (username) WHERE deleted_at IS NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'enterprises'
            AND column_name = 'deleted_at'
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS "IDX_d5d623090c8977c2cd2a905d65"
            ON enterprises (tax_code) WHERE deleted_at IS NULL;
        END IF;
      END
      $migration$;
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'The legacy baseline cannot be reverted safely because it may have adopted pre-existing tables.',
    );
  }
}
