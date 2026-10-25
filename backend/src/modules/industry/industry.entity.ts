import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index(['industryCode'], { unique: true })
@Entity('industries')
export class IndustryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'industry_code', type: 'varchar', length: 50 })
  industryCode: string;

  @Column({ name: 'industry_name', type: 'varchar', length: 255 })
  industryName: string;

  @Column({ name: 'level', type: 'int' })
  level: number;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => IndustryEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'fk_industries_parent',
  })
  parent: IndustryEntity | null;
}
