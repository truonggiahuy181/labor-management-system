import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OptionalAccidentDate1800000000001 implements MigrationInterface {
  name = 'OptionalAccidentDate1800000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE occupational_accident_cases
        ALTER COLUMN accident_date DROP NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE occupational_accident_cases
        ALTER COLUMN accident_date SET NOT NULL;
    `);
  }
}
