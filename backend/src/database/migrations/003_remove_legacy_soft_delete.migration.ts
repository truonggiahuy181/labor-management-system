import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLegacySoftDelete1792921772000 implements MigrationInterface {
  name = 'RemoveLegacySoftDelete1792921772000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_4a2fee81e0371b27e68c0fad6a";
      DROP INDEX IF EXISTS "IDX_d5d623090c8977c2cd2a905d65";

      ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE enterprises DROP COLUMN IF EXISTS deleted_at;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username
        ON users (username);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_enterprises_tax_code
        ON enterprises (tax_code);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_users_username;
      DROP INDEX IF EXISTS uq_enterprises_tax_code;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
      ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_4a2fee81e0371b27e68c0fad6a"
        ON users (username) WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_d5d623090c8977c2cd2a905d65"
        ON enterprises (tax_code) WHERE deleted_at IS NULL;
    `);
  }
}
