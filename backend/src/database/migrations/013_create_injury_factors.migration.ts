import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInjuryFactors1793523600000 implements MigrationInterface {
  name = 'CreateInjuryFactors1793523600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE injury_factors (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        factor_code VARCHAR(50) NOT NULL,
        factor_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE UNIQUE INDEX uq_injury_factors_factor_code
        ON injury_factors (factor_code);
      CREATE INDEX idx_injury_factors_factor_name
        ON injury_factors (factor_name);
      CREATE INDEX idx_injury_factors_is_active
        ON injury_factors (is_active);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE injury_factors;`);
  }
}
