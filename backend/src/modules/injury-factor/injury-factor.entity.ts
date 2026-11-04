import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';

@Index('uq_injury_factors_factor_code', ['factorCode'], { unique: true })
@Index('idx_injury_factors_factor_name', ['factorName'])
@Index('idx_injury_factors_is_active', ['isActive'])
@Entity('injury_factors')
export class InjuryFactorEntity extends BaseEntity {
  @Column({ name: 'factor_code', type: 'varchar', length: 50 })
  factorCode: string;

  @Column({ name: 'factor_name', type: 'varchar', length: 255 })
  factorName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
