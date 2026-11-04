import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';

@Index('idx_report_periods_report_year', ['reportYear'])
@Index('idx_report_periods_start_date', ['startDate'])
@Index('idx_report_periods_end_date', ['endDate'])
@Index('idx_report_periods_is_active', ['isActive'])
@Entity('report_periods')
export class ReportPeriodEntity extends BaseEntity {
  @Column({ name: 'report_name', type: 'varchar', length: 255 })
  reportName: string;

  @Column({ name: 'report_year', type: 'smallint' })
  reportYear: number;

  @Column({ name: 'report_period', type: 'varchar', length: 100 })
  reportPeriod: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
