import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolesAndUserColumnLengths1792921771000 implements MigrationInterface {
  name = 'AddRolesAndUserColumnLengths1792921771000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_code VARCHAR(50) NOT NULL,
        role_name VARCHAR(100) NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_role_code
        ON roles (role_code);

      INSERT INTO roles (id, role_code, role_name)
      VALUES
        (1, 'ADMIN', 'Quản trị viên'),
        (2, 'ENTERPRISE_USER', 'Người dùng doanh nghiệp')
      ON CONFLICT (id) DO UPDATE
      SET role_code = EXCLUDED.role_code,
          role_name = EXCLUDED.role_name;

      SELECT setval(
        pg_get_serial_sequence('roles', 'id'),
        COALESCE((SELECT MAX(id) FROM roles), 1),
        TRUE
      );

      ALTER TABLE users
        ALTER COLUMN username TYPE VARCHAR(50),
        ALTER COLUMN password_hash TYPE VARCHAR(255),
        ALTER COLUMN full_name TYPE VARCHAR(100),
        ALTER COLUMN email TYPE VARCHAR(100),
        ALTER COLUMN phone_number TYPE VARCHAR(20),
        ALTER COLUMN title TYPE VARCHAR(100),
        ALTER COLUMN avatar_url TYPE VARCHAR(255),
        ALTER COLUMN province_id TYPE VARCHAR(20),
        ALTER COLUMN district_id TYPE VARCHAR(20),
        ALTER COLUMN ward_id TYPE VARCHAR(20),
        ALTER COLUMN address TYPE VARCHAR(255),
        ALTER COLUMN reset_password_token TYPE VARCHAR(255),
        ALTER COLUMN email_change_otp TYPE VARCHAR(10),
        ALTER COLUMN email_change_pending TYPE VARCHAR(100);

      DO $migration$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_users_role'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT fk_users_role
            FOREIGN KEY (role_id) REFERENCES roles(id)
            ON DELETE RESTRICT;
        END IF;
      END
      $migration$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_role;

      ALTER TABLE users
        ALTER COLUMN username TYPE VARCHAR,
        ALTER COLUMN password_hash TYPE VARCHAR,
        ALTER COLUMN full_name TYPE VARCHAR,
        ALTER COLUMN email TYPE VARCHAR,
        ALTER COLUMN phone_number TYPE VARCHAR,
        ALTER COLUMN title TYPE VARCHAR,
        ALTER COLUMN avatar_url TYPE VARCHAR,
        ALTER COLUMN province_id TYPE VARCHAR,
        ALTER COLUMN district_id TYPE VARCHAR,
        ALTER COLUMN ward_id TYPE VARCHAR,
        ALTER COLUMN address TYPE VARCHAR,
        ALTER COLUMN reset_password_token TYPE VARCHAR,
        ALTER COLUMN email_change_otp TYPE VARCHAR,
        ALTER COLUMN email_change_pending TYPE VARCHAR;

      DROP TABLE roles;
    `);
  }
}
