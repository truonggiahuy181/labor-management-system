import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteColumns1793122200000 implements MigrationInterface {
  name = 'AddSoftDeleteColumns1793122200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      ALTER TABLE enterprises
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      ALTER TABLE roles
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      ALTER TABLE business_types
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      ALTER TABLE industries
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE industries DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE business_types DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE roles DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE enterprises DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
    `);
  }
}
