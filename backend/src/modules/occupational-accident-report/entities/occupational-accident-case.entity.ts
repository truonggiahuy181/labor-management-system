import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../commons/bases/base.entity.js';
import { AccidentCauseEntity } from '../../accident-cause/accident-cause.entity.js';
import { InjuryFactorEntity } from '../../injury-factor/injury-factor.entity.js';
import { OccupationalAccidentReportEntity } from './occupational-accident-report.entity.js';
import { OccupationalAccidentVictimGroupEntity } from './occupational-accident-victim-group.entity.js';

@Index('idx_oa_cases_report', ['reportId'])
@Index('idx_oa_cases_accident_date', ['accidentDate'])
@Index('idx_oa_cases_primary_cause', ['primaryCauseId'])
@Index('idx_oa_cases_factor', ['injuryFactorId'])
@Check(
  'chk_oa_cases_damage',
  'medical_cost_vnd >= 0 AND salary_cost_vnd >= 0 AND compensation_cost_vnd >= 0 AND lost_work_days >= 0 AND property_damage_vnd >= 0',
)
@Entity('occupational_accident_cases')
export class OccupationalAccidentCaseEntity extends BaseEntity {
  @Column({ name: 'report_id', type: 'int' })
  reportId: number;

  @ManyToOne(() => OccupationalAccidentReportEntity, (row) => row.cases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'report_id',
    foreignKeyConstraintName: 'fk_oa_cases_report',
  })
  report: Relation<OccupationalAccidentReportEntity>;

  @Column({ name: 'accident_date', type: 'date' })
  accidentDate: string;

  @Column({ name: 'primary_cause_id', type: 'int' })
  primaryCauseId: number;

  @ManyToOne(() => AccidentCauseEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'primary_cause_id',
    foreignKeyConstraintName: 'fk_oa_cases_primary_cause',
  })
  primaryCause: Relation<AccidentCauseEntity>;

  @Column({ name: 'injury_factor_id', type: 'int' })
  injuryFactorId: number;

  @ManyToOne(() => InjuryFactorEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'injury_factor_id',
    foreignKeyConstraintName: 'fk_oa_cases_factor',
  })
  injuryFactor: Relation<InjuryFactorEntity>;

  @Column({ name: 'medical_cost_vnd', type: 'bigint', default: '0' })
  medicalCostVnd: string;

  @Column({ name: 'salary_cost_vnd', type: 'bigint', default: '0' })
  salaryCostVnd: string;

  @Column({ name: 'compensation_cost_vnd', type: 'bigint', default: '0' })
  compensationCostVnd: string;

  @Column({ name: 'lost_work_days', type: 'int', default: 0 })
  lostWorkDays: number;

  @Column({ name: 'property_damage_vnd', type: 'bigint', default: '0' })
  propertyDamageVnd: string;

  @OneToMany(
    () => OccupationalAccidentVictimGroupEntity,
    (row) => row.accidentCase,
  )
  victimGroups: Relation<OccupationalAccidentVictimGroupEntity[]>;
}
