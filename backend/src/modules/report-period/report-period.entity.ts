import { Check, Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';
import { ReportPeriodCode, ReportTypeCode } from './report-period.constants.js';

@Index('idx_report_periods_report_year', ['reportYear'])
@Index('idx_report_periods_submission_start_date', ['submissionStartDate'])
@Index('idx_report_periods_submission_end_date', ['submissionEndDate'])
@Index('idx_report_periods_is_active', ['isActive'])
@Index(
  'uq_report_periods_type_year_period',
  ['reportTypeCode', 'reportYear', 'periodCode'],
  { unique: true },
)
@Check('chk_report_periods_year', 'report_year BETWEEN 2000 AND 2100')
@Check(
  'chk_report_periods_period_code',
  "period_code IN ('FIRST_HALF', 'ANNUAL', 'CUSTOM')",
)
@Check(
  'chk_report_periods_type_period',
  "(report_type_code = 'OCCUPATIONAL_ACCIDENT' AND period_code IN ('FIRST_HALF', 'ANNUAL')) OR (report_type_code <> 'OCCUPATIONAL_ACCIDENT' AND period_code = 'CUSTOM')",
)
@Check(
  'chk_report_periods_submission_range',
  'submission_end_date >= submission_start_date',
)
@Entity('report_periods')
export class ReportPeriodEntity extends BaseEntity {
  @Column({ name: 'report_name', type: 'varchar', length: 255 })
  reportName: string;

  @Column({ name: 'report_year', type: 'smallint' })
  reportYear: number;

  @Column({
    name: 'report_type_code',
    type: 'varchar',
    length: 50,
    default: ReportTypeCode.OTHER,
  })
  reportTypeCode: ReportTypeCode;

  @Column({
    name: 'period_code',
    type: 'varchar',
    length: 30,
    default: ReportPeriodCode.CUSTOM,
  })
  periodCode: ReportPeriodCode;

  @Column({ name: 'submission_start_date', type: 'date' })
  submissionStartDate: string;

  @Column({ name: 'submission_end_date', type: 'date' })
  submissionEndDate: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
