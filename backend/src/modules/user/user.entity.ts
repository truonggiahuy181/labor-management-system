import {
  Entity,
  Column,
  Check,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../commons/bases/base.entity.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';
import { ProvinceEntity } from '../location/province.entity.js';
import { WardEntity } from '../location/ward.entity.js';
import { RoleEntity } from '../role/role.entity.js';

@Index('uq_users_username', ['username'], { unique: true })
@Index('uq_users_enterprise_id', ['enterpriseId'], { unique: true })
@Index('idx_users_role_id', ['roleId'])
@Index('idx_users_is_active', ['isActive'])
@Check(
  'chk_users_location',
  '(province_id IS NULL AND ward_id IS NULL) OR (province_id IS NOT NULL AND ward_id IS NOT NULL)',
)
@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ name: 'username', type: 'varchar', length: 50 })
  username: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ name: 'dob', type: 'date', nullable: true })
  dob: Date | null;

  @Column({ name: 'gender', type: 'smallint', nullable: true })
  gender: number | null;

  @Column({ name: 'email', type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'title', type: 'varchar', length: 100, nullable: true })
  title: string | null;

  @Column({
    name: 'avatar_object_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  avatarObjectKey: string | null;

  @Column({ name: 'province_id', type: 'varchar', length: 2, nullable: true })
  provinceId: string | null;

  @ManyToOne(() => ProvinceEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'province_id',
    foreignKeyConstraintName: 'fk_users_province',
  })
  province: ProvinceEntity | null;

  @Column({ name: 'district_id', type: 'varchar', length: 20, nullable: true })
  districtId: string | null;

  @Column({ name: 'ward_id', type: 'varchar', length: 5, nullable: true })
  wardId: string | null;

  @ManyToOne(() => WardEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'ward_id',
      referencedColumnName: 'code',
      foreignKeyConstraintName: 'fk_users_ward_province',
    },
    { name: 'province_id', referencedColumnName: 'provinceCode' },
  ])
  ward: WardEntity | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @ManyToOne(() => RoleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'fk_users_role' })
  role: RoleEntity;

  @Column({ name: 'enterprise_id', type: 'int', nullable: true })
  enterpriseId: number | null;

  @OneToOne(() => EnterpriseEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'enterprise_id',
    foreignKeyConstraintName: 'fk_users_enterprise',
  })
  enterprise: EnterpriseEntity | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // ─── Reset Password ──────────────────────────────────────────────
  @Exclude()
  @Column({
    name: 'reset_password_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  resetPasswordToken: string | null;

  @Exclude()
  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  // ─── Force Logout sau khi đổi mật khẩu ──────────────────────────
  // Lưu timestamp khi đổi mật khẩu thành công.
  // JWT Strategy sẽ so sánh iat với giá trị này để invalidate token cũ.
  @Exclude()
  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt: Date | null;

  // ─── Email Change OTP ────────────────────────────────────────────
  @Exclude()
  @Column({
    name: 'email_change_otp',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  emailChangeOtp: string | null;

  @Exclude()
  @Column({
    name: 'email_change_otp_expires',
    type: 'timestamp',
    nullable: true,
  })
  emailChangeOtpExpires: Date | null;

  // Email mới đang chờ xác nhận OTP
  @Exclude()
  @Column({
    name: 'email_change_pending',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  emailChangePending: string | null;
}
