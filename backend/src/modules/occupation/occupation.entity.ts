import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';

@Index('uq_occupations_code', ['occupationCode'], { unique: true })
@Index('idx_occupations_name', ['occupationName'])
@Index('idx_occupations_level', ['level'])
@Index('idx_occupations_parent_id', ['parentId'])
@Index('idx_occupations_is_active', ['isActive'])
@Check('chk_occupations_level_range', 'level BETWEEN 1 AND 4')
@Check(
  'chk_occupations_parent_required',
  '(level = 1 AND parent_id IS NULL) OR (level BETWEEN 2 AND 4 AND parent_id IS NOT NULL)',
)
@Check(
  'chk_occupations_parent_not_self',
  'parent_id IS NULL OR parent_id <> id',
)
@Check('chk_occupations_code_format', "occupation_code ~ '^[0-9]{1,4}$'")
@Check('chk_occupations_code_length', 'char_length(occupation_code) = level')
@Entity('occupations')
export class OccupationEntity extends BaseEntity {
  @Column({ name: 'occupation_code', type: 'varchar', length: 4 })
  occupationCode: string;

  @Column({ name: 'occupation_name', type: 'varchar', length: 255 })
  occupationName: string;

  @Column({ name: 'level', type: 'smallint' })
  level: number;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => OccupationEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'fk_occupations_parent',
  })
  parent: OccupationEntity | null;
}
