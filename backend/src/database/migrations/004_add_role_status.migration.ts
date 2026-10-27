import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleStatus1792922633000 implements MigrationInterface {
  name = 'AddRoleStatus1792922633000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE roles
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE roles DROP COLUMN IF EXISTS is_active;
    `);
  }
}
