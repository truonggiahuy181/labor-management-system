import { Entity, Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';
import { BusinessTypeEntity } from '../business-type/business-type.entity.js';
import { IndustryEntity } from '../industry/industry.entity.js';

@Index('uq_enterprises_tax_code', ['taxCode'], { unique: true })
@Entity('enterprises')
export class EnterpriseEntity extends BaseEntity {
  // ─── Thông tin doanh nghiệp ──────────────────────────────────────
  @Column({ name: 'enterprise_name', type: 'varchar', length: 255 })
  enterpriseName: string;

  @Column({ name: 'tax_code', type: 'varchar', length: 50 })
  taxCode: string;

  @Column({ name: 'business_type_id', type: 'int' })
  businessTypeId: number;

  @ManyToOne(() => BusinessTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'business_type_id',
    foreignKeyConstraintName: 'fk_enterprises_business_type',
  })
  businessType: BusinessTypeEntity;

  @Column({ name: 'industry_id', type: 'int' })
  industryId: number;

  @ManyToOne(() => IndustryEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'industry_id',
    foreignKeyConstraintName: 'fk_enterprises_industry',
  })
  industry: IndustryEntity;

  @Column({ name: 'registration_date', type: 'date' })
  registrationDate: string;

  @Column({ name: 'province_id', type: 'varchar', length: 20 })
  provinceId: string;

  @Column({ name: 'ward_id', type: 'varchar', length: 20 })
  wardId: string;

  @Column({ name: 'address', type: 'varchar', length: 255 })
  address: string;

  // ─── Thông tin liên hệ ───────────────────────────────────────────
  @Column({
    name: 'foreign_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  foreignName: string | null;

  @Column({ name: 'email', type: 'varchar', length: 100 })
  email: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({
    name: 'op_province_id',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  operatingProvinceId: string | null;

  @Column({ name: 'op_ward_id', type: 'varchar', length: 20, nullable: true })
  operatingWardId: string | null;

  @Column({ name: 'op_address', type: 'varchar', length: 255, nullable: true })
  operatingAddress: string | null;

  @Column({
    name: 'representative_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  representativeName: string | null;

  @Column({
    name: 'representative_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  representativePhone: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
