import { Check, Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';
import type { AccidentCauseGroup } from './accident-cause.constants.js';

@Index('uq_accident_causes_code', ['causeCode'], { unique: true })
@Index('idx_accident_causes_group', ['causeGroup'])
@Index('idx_accident_causes_is_active', ['isActive'])
@Check(
  'chk_accident_causes_group',
  "cause_group IN ('EMPLOYER', 'EMPLOYEE', 'OBJECTIVE')",
)
@Check('chk_accident_causes_display_order', 'display_order > 0')
@Entity('accident_causes')
export class AccidentCauseEntity extends BaseEntity {
  @Column({ name: 'cause_code', type: 'varchar', length: 20 })
  causeCode: string;

  @Column({ name: 'cause_name', type: 'varchar', length: 255 })
  causeName: string;

  @Column({ name: 'cause_group', type: 'varchar', length: 20 })
  causeGroup: AccidentCauseGroup;

  @Column({ name: 'display_order', type: 'smallint' })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
