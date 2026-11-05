import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInjuryTypes1793696400000 implements MigrationInterface {
  name = 'CreateInjuryTypes1793696400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE injury_types (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        injury_type_code VARCHAR(3) NOT NULL,
        injury_type_name VARCHAR(255) NOT NULL,
        level SMALLINT NOT NULL,
        parent_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT fk_injury_types_parent
          FOREIGN KEY (parent_id) REFERENCES injury_types(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_injury_types_level_range
          CHECK (level BETWEEN 1 AND 3),
        CONSTRAINT chk_injury_types_parent_required
          CHECK (
            (level = 1 AND parent_id IS NULL)
            OR (level IN (2, 3) AND parent_id IS NOT NULL)
          ),
        CONSTRAINT chk_injury_types_parent_not_self
          CHECK (parent_id IS NULL OR parent_id <> id),
        CONSTRAINT chk_injury_types_code_format
          CHECK (injury_type_code ~ '^[0-9]{1,3}$'),
        CONSTRAINT chk_injury_types_code_length
          CHECK (char_length(injury_type_code) = level)
      );

      CREATE UNIQUE INDEX uq_injury_types_code
        ON injury_types (injury_type_code);
      CREATE UNIQUE INDEX uq_injury_types_parent_name
        ON injury_types (
          COALESCE(parent_id, 0),
          LOWER(injury_type_name)
        );
      CREATE INDEX idx_injury_types_name
        ON injury_types (injury_type_name);
      CREATE INDEX idx_injury_types_level
        ON injury_types (level);
      CREATE INDEX idx_injury_types_parent_id
        ON injury_types (parent_id);
      CREATE INDEX idx_injury_types_is_active
        ON injury_types (is_active);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE injury_types;`);
  }
}
