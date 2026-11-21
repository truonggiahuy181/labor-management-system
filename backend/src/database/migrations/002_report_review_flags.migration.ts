import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportReviewFlags1800000000002 implements MigrationInterface {
  name = 'ReportReviewFlags1800000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE occupational_accident_reports
        ADD COLUMN review_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN review_note varchar(500) NOT NULL DEFAULT '',
        ADD COLUMN review_updated_by int,
        ADD COLUMN review_updated_at timestamptz,
        ADD CONSTRAINT chk_oa_reports_review_flags CHECK (
          jsonb_typeof(review_flags) = 'array'
          AND review_flags <@ '["MISSING_WORKFORCE","MISSING_SIGNATURE","INCONSISTENT_DATA"]'::jsonb
        );
      ALTER TABLE occupational_accident_report_histories
        ADD COLUMN review_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN review_note varchar(500) NOT NULL DEFAULT '',
        ADD COLUMN review_updated_by int,
        ADD COLUMN review_updated_at timestamptz;
      CREATE INDEX idx_oa_reports_review_flags
        ON occupational_accident_reports USING gin (review_flags)
        WHERE status = 'SUBMITTED';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_oa_reports_review_flags;
      ALTER TABLE occupational_accident_report_histories
        DROP COLUMN review_flags, DROP COLUMN review_note,
        DROP COLUMN review_updated_by, DROP COLUMN review_updated_at;
      ALTER TABLE occupational_accident_reports
        DROP CONSTRAINT chk_oa_reports_review_flags,
        DROP COLUMN review_flags, DROP COLUMN review_note,
        DROP COLUMN review_updated_by, DROP COLUMN review_updated_at;
    `);
  }
}
