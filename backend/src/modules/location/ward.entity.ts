import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { ProvinceEntity } from './province.entity.js';

@Index('idx_wards_province_code', ['provinceCode'])
@Index('uq_wards_code_province_code', ['code', 'provinceCode'], {
  unique: true,
})
@Entity('wards')
export class WardEntity {
  @PrimaryColumn({ name: 'code', type: 'varchar', length: 5 })
  code: string;

  @Column({ name: 'province_code', type: 'varchar', length: 2 })
  provinceCode: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'division_type', type: 'varchar', length: 30 })
  divisionType: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne('ProvinceEntity', 'wards', {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'province_code',
    foreignKeyConstraintName: 'fk_wards_province',
  })
  province: ProvinceEntity;
}
