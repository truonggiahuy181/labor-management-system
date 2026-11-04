import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportPeriods1793437200000 implements MigrationInterface {
  name = 'CreateReportPeriods1793437200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE report_periods (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        report_name VARCHAR(255) NOT NULL,
        report_year SMALLINT NOT NULL,
        report_period VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT ck_report_periods_year
          CHECK (report_year BETWEEN 2000 AND 2100),
        CONSTRAINT ck_report_periods_date_range
          CHECK (end_date >= start_date)
      );

      CREATE UNIQUE INDEX uq_report_periods_name_year_period
        ON report_periods (
          LOWER(report_name),
          report_year,
          LOWER(report_period)
        )
        WHERE deleted_at IS NULL;

      CREATE INDEX idx_report_periods_report_year
        ON report_periods (report_year);
      CREATE INDEX idx_report_periods_start_date
        ON report_periods (start_date);
      CREATE INDEX idx_report_periods_end_date
        ON report_periods (end_date);
      CREATE INDEX idx_report_periods_is_active
        ON report_periods (is_active);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE report_periods;`);
  }
}
