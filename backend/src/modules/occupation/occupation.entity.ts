import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';

@Index('uq_occupations_code', ['occupationCode'], { unique: true })
@Index('idx_occupations_name', ['occupationName'])
@Index('idx_occupations_level', ['level'])
@Index('idx_occupations_parent_id', ['parentId'])
@Index('idx_occupations_is_active', ['isActive'])
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
