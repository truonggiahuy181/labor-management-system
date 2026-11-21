import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomReportReviewLabels1800000000003 implements MigrationInterface {
  name = 'CustomReportReviewLabels1800000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE occupational_accident_review_labels (
        code varchar(60) PRIMARY KEY,
        label varchar(100) NOT NULL,
        normalized_label varchar(100) NOT NULL,
        reason varchar(1000) NOT NULL,
        sort_order int NOT NULL DEFAULT 100,
        created_by int,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_oa_review_label_length CHECK (char_length(label) BETWEEN 2 AND 100)
      );
      CREATE UNIQUE INDEX uq_oa_review_labels_normalized
        ON occupational_accident_review_labels (normalized_label);
      INSERT INTO occupational_accident_review_labels (code, label, normalized_label, reason, sort_order)
      VALUES
        ('MISSING_WORKFORCE', 'Thiếu số liệu lao động', 'thiếu số liệu lao động',
         'Vui lòng bổ sung đầy đủ số liệu lao động tại phần thông tin chung của báo cáo.', 0),
        ('MISSING_SIGNATURE', 'Tài liệu thiếu chữ ký', 'tài liệu thiếu chữ ký',
         'Vui lòng bổ sung tài liệu báo cáo có đầy đủ chữ ký, đóng dấu.', 1),
        ('INCONSISTENT_DATA', 'Số liệu không khớp', 'số liệu không khớp',
         'Vui lòng rà soát, điều chỉnh các số liệu chưa khớp giữa báo cáo và tài liệu đính kèm.', 2);
      ALTER TABLE occupational_accident_reports
        DROP CONSTRAINT chk_oa_reports_review_flags,
        ADD CONSTRAINT chk_oa_reports_review_flags CHECK (
          jsonb_typeof(review_flags) = 'array'
          AND jsonb_array_length(review_flags) <= 20
        );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Keep custom label names and historical references intact on a mistaken rollback.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM occupational_accident_reports
          WHERE NOT review_flags <@ '["MISSING_WORKFORCE","MISSING_SIGNATURE","INCONSISTENT_DATA"]'::jsonb
        ) OR EXISTS (
          SELECT 1 FROM occupational_accident_report_histories
          WHERE NOT review_flags <@ '["MISSING_WORKFORCE","MISSING_SIGNATURE","INCONSISTENT_DATA"]'::jsonb
        ) OR EXISTS (
          SELECT 1 FROM occupational_accident_review_labels WHERE code LIKE 'CUSTOM_%'
        ) THEN
          RAISE EXCEPTION 'Custom review labels exist; migrate their references before reverting.';
        END IF;
      END $$;
      ALTER TABLE occupational_accident_reports
        DROP CONSTRAINT chk_oa_reports_review_flags,
        ADD CONSTRAINT chk_oa_reports_review_flags CHECK (
          jsonb_typeof(review_flags) = 'array'
          AND review_flags <@ '["MISSING_WORKFORCE","MISSING_SIGNATURE","INCONSISTENT_DATA"]'::jsonb
        );
      DROP TABLE occupational_accident_review_labels;
    `);
  }
}
