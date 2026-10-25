import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../commons/bases/base.entity.js';

@Index(['taxCode'], { unique: true, where: 'deleted_at IS NULL' })
@Entity('enterprises')
export class EnterpriseEntity extends BaseEntity {
  // ─── Thông tin doanh nghiệp ──────────────────────────────────────
  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ name: 'tax_code' })
  taxCode: string;

  @Column({ name: 'business_type' })
  businessType: string;

  @Column({ name: 'main_industry' })
  mainIndustry: string;

  @Column({ name: 'license_date', type: 'date' })
  licenseDate: string;

  @Column({ name: 'province' })
  province: string;

  @Column({ name: 'ward' })
  ward: string;

  @Column({ name: 'address' })
  address: string;

  // ─── Thông tin liên hệ ───────────────────────────────────────────
  @Column({ name: 'foreign_name', type: 'varchar', nullable: true })
  foreignName: string | null;

  @Column({ name: 'email' })
  email: string;

  @Column({ name: 'office_phone', type: 'varchar', nullable: true })
  officePhone: string | null;

  @Column({ name: 'leader_name', type: 'varchar', nullable: true })
  leaderName: string | null;

  @Column({ name: 'leader_phone', type: 'varchar', nullable: true })
  leaderPhone: string | null;

  @Column({ name: 'operating_province', type: 'varchar', nullable: true })
  operatingProvince: string | null;

  @Column({ name: 'operating_ward', type: 'varchar', nullable: true })
  operatingWard: string | null;

  @Column({ name: 'business_location', type: 'varchar', nullable: true })
  businessLocation: string | null;

  // ─── File đính kèm (đường dẫn tương đối trong UPLOAD_DIR) ────────
  @Column({ name: 'business_license_path', type: 'varchar', nullable: true })
  businessLicensePath: string | null;

  @Column({ name: 'other_document_path', type: 'varchar', nullable: true })
  otherDocumentPath: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
