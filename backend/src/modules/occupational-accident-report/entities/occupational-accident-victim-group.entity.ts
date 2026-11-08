import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../commons/bases/base.entity.js';
import { OccupationEntity } from '../../occupation/occupation.entity.js';
import { OccupationalAccidentCaseEntity } from './occupational-accident-case.entity.js';

@Index('idx_oa_victim_groups_case', ['accidentCaseId'])
@Index('idx_oa_victim_groups_occupation', ['occupationId'])
@Index(
  'uq_oa_victim_groups_dimension',
  ['accidentCaseId', 'occupationId', 'isUnderEnterpriseManagement'],
  { unique: true },
)
@Check(
  'chk_oa_victim_groups_counts',
  'victim_count > 0 AND female_count BETWEEN 0 AND victim_count AND death_count >= 0 AND severe_count >= 0 AND death_count + severe_count <= victim_count',
)
@Entity('occupational_accident_victim_groups')
export class OccupationalAccidentVictimGroupEntity extends BaseEntity {
  @Column({ name: 'accident_case_id', type: 'int' })
  accidentCaseId: number;

  @ManyToOne(() => OccupationalAccidentCaseEntity, (row) => row.victimGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'accident_case_id',
    foreignKeyConstraintName: 'fk_oa_victim_groups_case',
  })
  accidentCase: Relation<OccupationalAccidentCaseEntity>;

  @Column({ name: 'occupation_id', type: 'int' })
  occupationId: number;

  @ManyToOne(() => OccupationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'occupation_id',
    foreignKeyConstraintName: 'fk_oa_victim_groups_occupation',
  })
  occupation: Relation<OccupationEntity>;

  @Column({ name: 'is_under_enterprise_management', type: 'boolean' })
  isUnderEnterpriseManagement: boolean;

  @Column({ name: 'victim_count', type: 'int' })
  victimCount: number;

  @Column({ name: 'female_count', type: 'int', default: 0 })
  femaleCount: number;

  @Column({ name: 'death_count', type: 'int', default: 0 })
  deathCount: number;

  @Column({ name: 'severe_count', type: 'int', default: 0 })
  severeCount: number;
}
