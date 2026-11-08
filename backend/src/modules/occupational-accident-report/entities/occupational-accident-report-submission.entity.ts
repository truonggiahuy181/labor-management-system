import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { UserEntity } from '../../user/user.entity.js';
import { OccupationalAccidentReportEntity } from './occupational-accident-report.entity.js';
import { OccupationalAccidentReportHistoryEntity } from './occupational-accident-report-history.entity.js';

export type OccupationalAccidentSubmissionSnapshot = Record<string, unknown>;

@Index('uq_oa_submissions_report_number', ['reportId', 'submissionNo'], {
  unique: true,
})
@Index('idx_oa_submissions_report', ['reportId'])
@Index('idx_oa_submissions_submitted_at', ['submittedAt'])
@Check('chk_oa_submissions_number', 'submission_no > 0')
@Check('chk_oa_submissions_document_size', 'document_size > 0')
@Check(
  'chk_oa_submissions_document_sha256',
  "document_sha256 ~ '^[0-9a-f]{64}$'",
)
@Entity('occupational_accident_report_submissions')
export class OccupationalAccidentReportSubmissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'report_id', type: 'int' })
  reportId: number;

  @ManyToOne(
    () => OccupationalAccidentReportEntity,
    (report) => report.submissions,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({
    name: 'report_id',
    foreignKeyConstraintName: 'fk_oa_submissions_report',
  })
  report: Relation<OccupationalAccidentReportEntity>;

  @Column({ name: 'submission_no', type: 'int' })
  submissionNo: number;

  @Column({ name: 'report_date', type: 'date' })
  reportDate: string;

  @Column({ name: 'submitted_by', type: 'int' })
  submittedBy: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'submitted_by',
    foreignKeyConstraintName: 'fk_oa_submissions_user',
  })
  submitter: Relation<UserEntity>;

  @Column({ name: 'submitted_at', type: 'timestamp' })
  submittedAt: Date;

  @Column({ name: 'payload_snapshot', type: 'jsonb' })
  payloadSnapshot: OccupationalAccidentSubmissionSnapshot;

  @Column({ name: 'document_object_key', type: 'varchar', length: 500 })
  documentObjectKey: string;

  @Column({ name: 'document_original_name', type: 'varchar', length: 255 })
  documentOriginalName: string;

  @Column({ name: 'document_content_type', type: 'varchar', length: 100 })
  documentContentType: string;

  @Column({ name: 'document_size', type: 'bigint' })
  documentSize: string;

  @Column({ name: 'document_sha256', type: 'char', length: 64 })
  documentSha256: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(
    () => OccupationalAccidentReportHistoryEntity,
    (history) => history.submission,
  )
  histories: Relation<OccupationalAccidentReportHistoryEntity[]>;
}
