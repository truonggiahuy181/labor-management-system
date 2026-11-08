import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  VersionColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../commons/bases/base.entity.js';
import { EnterpriseEntity } from '../../enterprise/enterprise.entity.js';
import { ReportPeriodEntity } from '../../report-period/report-period.entity.js';
import {
  OccupationalAccidentReportStatus,
  type OccupationalAccidentReportStatus as ReportStatus,
} from '../occupational-accident-report.constants.js';
import { OccupationalAccidentCaseEntity } from './occupational-accident-case.entity.js';
import { OccupationalAccidentArticle39SummaryEntity } from './occupational-accident-article39-summary.entity.js';
import { OccupationalAccidentReportHistoryEntity } from './occupational-accident-report-history.entity.js';
import { OccupationalAccidentReportSubmissionEntity } from './occupational-accident-report-submission.entity.js';
import { OccupationalAccidentReportDraftDocumentEntity } from './occupational-accident-report-draft-document.entity.js';

@Index('uq_oa_reports_enterprise_period', ['enterpriseId', 'reportPeriodId'], {
  unique: true,
})
@Index('idx_oa_reports_status', ['status'])
@Index('idx_oa_reports_enterprise', ['enterpriseId'])
@Index('idx_oa_reports_period', ['reportPeriodId'])
@Check(
  'chk_oa_reports_status',
  "status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'RETURNED')",
)
@Check(
  'chk_oa_reports_workforce',
  'total_employees >= 0 AND female_employees BETWEEN 0 AND total_employees AND payroll_fund_vnd >= 0',
)
@Check(
  'chk_oa_reports_admin_unit_level',
  "administrative_unit_level IS NULL OR administrative_unit_level IN ('PROVINCE', 'WARD')",
)
@Entity('occupational_accident_reports')
export class OccupationalAccidentReportEntity extends BaseEntity {
  @Column({ name: 'enterprise_id', type: 'int' })
  enterpriseId: number;

  @ManyToOne(() => EnterpriseEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'enterprise_id',
    foreignKeyConstraintName: 'fk_oa_reports_enterprise',
  })
  enterprise: Relation<EnterpriseEntity>;

  @Column({ name: 'report_period_id', type: 'int' })
  reportPeriodId: number;

  @ManyToOne(() => ReportPeriodEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'report_period_id',
    foreignKeyConstraintName: 'fk_oa_reports_period',
  })
  reportPeriod: Relation<ReportPeriodEntity>;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: OccupationalAccidentReportStatus.DRAFT,
  })
  status: ReportStatus;

  @Column({ name: 'enterprise_name', type: 'varchar', length: 255 })
  enterpriseName: string;

  @Column({ name: 'tax_code', type: 'varchar', length: 50 })
  taxCode: string;

  @Column({ name: 'enterprise_address', type: 'varchar', length: 500 })
  enterpriseAddress: string;

  @Column({ name: 'business_type_code', type: 'varchar', length: 50 })
  businessTypeCode: string;

  @Column({ name: 'business_type_name', type: 'varchar', length: 255 })
  businessTypeName: string;

  @Column({ name: 'industry_code', type: 'varchar', length: 4 })
  industryCode: string;

  @Column({ name: 'industry_name', type: 'varchar', length: 255 })
  industryName: string;

  @Column({
    name: 'administrative_unit_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  administrativeUnitCode: string | null;

  @Column({
    name: 'administrative_unit_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  administrativeUnitName: string | null;

  @Column({
    name: 'administrative_unit_level',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  administrativeUnitLevel: 'PROVINCE' | 'WARD' | null;

  @Column({
    name: 'recipient_agency_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recipientAgencyName: string | null;

  @Column({ name: 'total_employees', type: 'int', default: 0 })
  totalEmployees: number;

  @Column({ name: 'female_employees', type: 'int', default: 0 })
  femaleEmployees: number;

  @Column({ name: 'payroll_fund_vnd', type: 'bigint', default: '0' })
  payrollFundVnd: string;

  @Column({ name: 'no_accidents_declared', type: 'boolean', default: false })
  noAccidentsDeclared: boolean;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'received_at', type: 'timestamp', nullable: true })
  receivedAt: Date | null;

  @Column({ name: 'returned_at', type: 'timestamp', nullable: true })
  returnedAt: Date | null;

  @Column({
    name: 'returned_reason',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  returnedReason: string | null;

  @VersionColumn({ name: 'version', type: 'int', default: 1 })
  version: number;

  @OneToMany(() => OccupationalAccidentCaseEntity, (row) => row.report)
  cases: Relation<OccupationalAccidentCaseEntity[]>;

  @OneToOne(
    () => OccupationalAccidentArticle39SummaryEntity,
    (summary) => summary.report,
  )
  article39Summary: Relation<OccupationalAccidentArticle39SummaryEntity | null>;

  @OneToMany(
    () => OccupationalAccidentReportSubmissionEntity,
    (submission) => submission.report,
  )
  submissions: Relation<OccupationalAccidentReportSubmissionEntity[]>;

  @OneToOne(
    () => OccupationalAccidentReportDraftDocumentEntity,
    (document) => document.report,
  )
  draftDocument: Relation<OccupationalAccidentReportDraftDocumentEntity | null>;

  @OneToMany(() => OccupationalAccidentReportHistoryEntity, (row) => row.report)
  histories: Relation<OccupationalAccidentReportHistoryEntity[]>;

  static readonly INITIAL_STATUS = OccupationalAccidentReportStatus.DRAFT;
}
