import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserAvatarUrlToObjectKey1793214000000 implements MigrationInterface {
  name = 'RenameUserAvatarUrlToObjectKey1793214000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        RENAME COLUMN avatar_url TO avatar_object_key;

      UPDATE users
      SET avatar_object_key = NULL
      WHERE avatar_object_key IS NOT NULL
        AND avatar_object_key NOT LIKE 'avatars/%';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        RENAME COLUMN avatar_object_key TO avatar_url;
    `);
  }
}
