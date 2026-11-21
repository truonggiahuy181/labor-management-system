import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserLastLoginAt1800000000004 implements MigrationInterface {
  name = 'UserLastLoginAt1800000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS last_login_at;
    `);
  }
}

