import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnterpriseDocumentKeys1793350800000 implements MigrationInterface {
  name = 'AddEnterpriseDocumentKeys1793350800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enterprises
        ADD COLUMN IF NOT EXISTS business_license_key VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS other_document_key VARCHAR(255) NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enterprises
        DROP COLUMN IF EXISTS business_license_key,
        DROP COLUMN IF EXISTS other_document_key;
    `);
  }
}
