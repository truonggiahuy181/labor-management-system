import { Check, Entity, Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';
import { BusinessTypeEntity } from '../business-type/business-type.entity.js';
import { IndustryEntity } from '../industry/industry.entity.js';
import { ProvinceEntity } from '../location/province.entity.js';
import { WardEntity } from '../location/ward.entity.js';

export interface EnterpriseStoredFile {
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
}

export interface EnterpriseFiles {
  businessLicense?: EnterpriseStoredFile;
  otherDocument?: EnterpriseStoredFile;
}

@Index('uq_enterprises_tax_code', ['taxCode'], { unique: true })
@Index('idx_enterprises_business_type_id', ['businessTypeId'])
@Index('idx_enterprises_industry_id', ['industryId'])
@Index('idx_enterprises_province_id', ['provinceId'])
@Index('idx_enterprises_is_active', ['isActive'])
@Check(
  'chk_enterprises_operating_location',
  '(op_province_id IS NULL AND op_ward_id IS NULL) OR (op_province_id IS NOT NULL AND op_ward_id IS NOT NULL)',
)
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

  @Column({ name: 'province_id', type: 'varchar', length: 2 })
  provinceId: string;

  @ManyToOne(() => ProvinceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'province_id',
    foreignKeyConstraintName: 'fk_enterprises_province',
  })
  province: ProvinceEntity;

  @Column({ name: 'ward_id', type: 'varchar', length: 5 })
  wardId: string;

  @ManyToOne(() => WardEntity, { onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'ward_id',
      referencedColumnName: 'code',
      foreignKeyConstraintName: 'fk_enterprises_ward_province',
    },
    { name: 'province_id', referencedColumnName: 'provinceCode' },
  ])
  ward: WardEntity;

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
    length: 2,
    nullable: true,
  })
  operatingProvinceId: string | null;

  @ManyToOne(() => ProvinceEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'op_province_id',
    foreignKeyConstraintName: 'fk_enterprises_operating_province',
  })
  operatingProvince: ProvinceEntity | null;

  @Column({ name: 'op_ward_id', type: 'varchar', length: 5, nullable: true })
  operatingWardId: string | null;

  @ManyToOne(() => WardEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'op_ward_id',
      referencedColumnName: 'code',
      foreignKeyConstraintName: 'fk_enterprises_operating_ward_province',
    },
    { name: 'op_province_id', referencedColumnName: 'provinceCode' },
  ])
  operatingWard: WardEntity | null;

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

  @Column({
    name: 'business_license_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  businessLicenseKey: string | null;

  @Column({
    name: 'other_document_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  otherDocumentKey: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'files', type: 'jsonb', default: () => "'{}'::jsonb" })
  files: EnterpriseFiles;
}
