import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { OccupationalAccidentReportEntity } from './occupational-accident-report.entity.js';

@Check(
  'chk_oa_article39_counts',
  'total_cases >= 0 AND fatal_cases BETWEEN 0 AND total_cases AND multi_victim_cases BETWEEN 0 AND total_cases AND victim_count >= total_cases + multi_victim_cases AND female_count BETWEEN 0 AND victim_count AND death_count >= 0 AND severe_count >= 0 AND death_count + severe_count <= victim_count AND fatal_cases <= death_count AND unmanaged_victim_count BETWEEN 0 AND victim_count AND unmanaged_female_count BETWEEN 0 AND unmanaged_victim_count AND unmanaged_death_count >= 0 AND unmanaged_severe_count >= 0 AND unmanaged_death_count + unmanaged_severe_count <= unmanaged_victim_count',
)
@Check(
  'chk_oa_article39_damage',
  'medical_cost_vnd >= 0 AND salary_cost_vnd >= 0 AND compensation_cost_vnd >= 0 AND lost_work_days >= 0 AND property_damage_vnd >= 0',
)
@Entity('occupational_accident_article39_summaries')
export class OccupationalAccidentArticle39SummaryEntity {
  @PrimaryColumn({ name: 'report_id', type: 'int' })
  reportId: number;

  @OneToOne(
    () => OccupationalAccidentReportEntity,
    (report) => report.article39Summary,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'report_id',
    foreignKeyConstraintName: 'fk_oa_article39_report',
  })
  report: Relation<OccupationalAccidentReportEntity>;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'total_cases', type: 'int', default: 0 })
  totalCases: number;

  @Column({ name: 'fatal_cases', type: 'int', default: 0 })
  fatalCases: number;

  @Column({ name: 'multi_victim_cases', type: 'int', default: 0 })
  multiVictimCases: number;

  @Column({ name: 'victim_count', type: 'int', default: 0 })
  victimCount: number;

  @Column({ name: 'female_count', type: 'int', default: 0 })
  femaleCount: number;

  @Column({ name: 'death_count', type: 'int', default: 0 })
  deathCount: number;

  @Column({ name: 'severe_count', type: 'int', default: 0 })
  severeCount: number;

  @Column({ name: 'unmanaged_victim_count', type: 'int', default: 0 })
  unmanagedVictimCount: number;

  @Column({ name: 'unmanaged_female_count', type: 'int', default: 0 })
  unmanagedFemaleCount: number;

  @Column({ name: 'unmanaged_death_count', type: 'int', default: 0 })
  unmanagedDeathCount: number;

  @Column({ name: 'unmanaged_severe_count', type: 'int', default: 0 })
  unmanagedSevereCount: number;

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
}
