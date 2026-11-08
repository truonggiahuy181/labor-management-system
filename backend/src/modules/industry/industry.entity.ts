import {
  Column,
  Check,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('uq_industries_industry_code', ['industryCode'], { unique: true })
@Index('idx_industries_name', ['industryName'])
@Index('idx_industries_level', ['level'])
@Index('idx_industries_parent_id', ['parentId'])
@Index('idx_industries_is_active', ['isActive'])
@Check('chk_industries_level_range', 'level BETWEEN 1 AND 4')
@Check(
  'chk_industries_parent_required',
  '(level = 1 AND parent_id IS NULL) OR (level BETWEEN 2 AND 4 AND parent_id IS NOT NULL)',
)
@Check('chk_industries_parent_not_self', 'parent_id IS NULL OR parent_id <> id')
@Check(
  'chk_industries_code_format',
  "(level = 1 AND industry_code ~ '^[A-V]$') OR (level = 2 AND industry_code ~ '^[0-9]{2}$') OR (level = 3 AND industry_code ~ '^[0-9]{3}$') OR (level = 4 AND industry_code ~ '^[0-9]{4}$')",
)
@Entity('industries')
export class IndustryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'industry_code', type: 'varchar', length: 4 })
  industryCode: string;

  @Column({ name: 'industry_name', type: 'varchar', length: 255 })
  industryName: string;

  @Column({ name: 'level', type: 'smallint' })
  level: number;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => IndustryEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'fk_industries_parent',
  })
  parent: IndustryEntity | null;
}
