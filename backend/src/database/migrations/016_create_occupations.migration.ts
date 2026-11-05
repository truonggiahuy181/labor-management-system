import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOccupations1793782800000 implements MigrationInterface {
  name = 'CreateOccupations1793782800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE occupations (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        occupation_code VARCHAR(4) NOT NULL,
        occupation_name VARCHAR(255) NOT NULL,
        level SMALLINT NOT NULL,
        parent_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT fk_occupations_parent
          FOREIGN KEY (parent_id) REFERENCES occupations(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_occupations_level_range
          CHECK (level BETWEEN 1 AND 4),
        CONSTRAINT chk_occupations_parent_required
          CHECK (
            (level = 1 AND parent_id IS NULL)
            OR (level BETWEEN 2 AND 4 AND parent_id IS NOT NULL)
          ),
        CONSTRAINT chk_occupations_parent_not_self
          CHECK (parent_id IS NULL OR parent_id <> id),
        CONSTRAINT chk_occupations_code_format
          CHECK (occupation_code ~ '^[0-9]{1,4}$'),
        CONSTRAINT chk_occupations_code_length
          CHECK (char_length(occupation_code) = level)
      );

      CREATE UNIQUE INDEX uq_occupations_code
        ON occupations (occupation_code);
      CREATE UNIQUE INDEX uq_occupations_parent_name
        ON occupations (
          COALESCE(parent_id, 0),
          LOWER(occupation_name)
        );
      CREATE INDEX idx_occupations_name
        ON occupations (occupation_name);
      CREATE INDEX idx_occupations_level
        ON occupations (level);
      CREATE INDEX idx_occupations_parent_id
        ON occupations (parent_id);
      CREATE INDEX idx_occupations_is_active
        ON occupations (is_active);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE occupations;`);
  }
}
