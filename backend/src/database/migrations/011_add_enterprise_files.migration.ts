import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnterpriseFiles1793300400000 implements MigrationInterface {
  name = 'AddEnterpriseFiles1793300400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enterprises
        ADD COLUMN files JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enterprises DROP COLUMN IF EXISTS files;
    `);
  }
}
