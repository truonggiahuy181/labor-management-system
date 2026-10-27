import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceOneUserPerEnterprise1793035800000 implements MigrationInterface {
  name = 'EnforceOneUserPerEnterprise1793035800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT enterprise_id
          FROM users
          WHERE enterprise_id IS NOT NULL
          GROUP BY enterprise_id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION
            'Cannot enforce one user per enterprise: duplicate users.enterprise_id values exist';
        END IF;
      END
      $migration$;

      ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_enterprise;
      ALTER TABLE users
        ADD CONSTRAINT fk_users_enterprise
        FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
        ON DELETE RESTRICT;

      ALTER TABLE users
        ADD CONSTRAINT uq_users_enterprise_id UNIQUE (enterprise_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_enterprise_id;
      ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_enterprise;
      ALTER TABLE users
        ADD CONSTRAINT fk_users_enterprise
        FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
        ON DELETE SET NULL;
    `);
  }
}
