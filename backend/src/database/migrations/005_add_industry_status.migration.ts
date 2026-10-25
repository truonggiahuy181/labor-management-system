import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndustryStatus1792948892000 implements MigrationInterface {
  name = 'AddIndustryStatus1792948892000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE industries
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE industries DROP COLUMN IF EXISTS is_active;
    `);
  }
}
