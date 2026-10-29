import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import type { WardEntity } from './ward.entity.js';

@Entity('provinces')
export class ProvinceEntity {
  @PrimaryColumn({ name: 'code', type: 'varchar', length: 2 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'division_type', type: 'varchar', length: 30 })
  divisionType: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany('WardEntity', 'province')
  wards: WardEntity[];
}
