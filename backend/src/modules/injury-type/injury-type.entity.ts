import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';

@Index('uq_injury_types_code', ['injuryTypeCode'], { unique: true })
@Index('idx_injury_types_name', ['injuryTypeName'])
@Index('idx_injury_types_level', ['level'])
@Index('idx_injury_types_parent_id', ['parentId'])
@Index('idx_injury_types_is_active', ['isActive'])
@Entity('injury_types')
export class InjuryTypeEntity extends BaseEntity {
  @Column({ name: 'injury_type_code', type: 'varchar', length: 3 })
  injuryTypeCode: string;

  @Column({ name: 'injury_type_name', type: 'varchar', length: 255 })
  injuryTypeName: string;

  @Column({ name: 'level', type: 'smallint' })
  level: number;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => InjuryTypeEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'fk_injury_types_parent',
  })
  parent: InjuryTypeEntity | null;
}
