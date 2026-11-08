import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { OccupationalAccidentReportStatus } from '../occupational-accident-report.constants.js';
import { OccupationalAccidentReportEntity } from './occupational-accident-report.entity.js';
import { OccupationalAccidentReportSubmissionEntity } from './occupational-accident-report-submission.entity.js';

@Index('idx_oa_report_histories_report', ['reportId'])
@Index('idx_oa_report_histories_submission', ['submissionId'])
@Check(
  'chk_oa_report_histories_from_status',
  "from_status IS NULL OR from_status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'RETURNED')",
)
@Check(
  'chk_oa_report_histories_to_status',
  "to_status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'RETURNED')",
)
@Entity('occupational_accident_report_histories')
export class OccupationalAccidentReportHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'report_id', type: 'int' })
  reportId: number;

  @ManyToOne(() => OccupationalAccidentReportEntity, (row) => row.histories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'report_id',
    foreignKeyConstraintName: 'fk_oa_report_histories_report',
  })
  report: Relation<OccupationalAccidentReportEntity>;

  @Column({ name: 'submission_id', type: 'int', nullable: true })
  submissionId: number | null;

  @ManyToOne(
    () => OccupationalAccidentReportSubmissionEntity,
    (submission) => submission.histories,
    { nullable: true, onDelete: 'RESTRICT' },
  )
  @JoinColumn({
    name: 'submission_id',
    foreignKeyConstraintName: 'fk_oa_report_histories_submission',
  })
  submission: Relation<OccupationalAccidentReportSubmissionEntity | null>;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: OccupationalAccidentReportStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: OccupationalAccidentReportStatus;

  @Column({ name: 'reason', type: 'varchar', length: 1000, nullable: true })
  reason: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
