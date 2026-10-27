import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnterpriseStatus1792949400000 implements MigrationInterface {
  name = 'AddEnterpriseStatus1792949400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enterprises
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enterprises DROP COLUMN IF EXISTS is_active;
    `);
  }
}
