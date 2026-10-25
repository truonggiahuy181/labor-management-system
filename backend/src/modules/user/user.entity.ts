import { Entity, Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../commons/bases/base.entity.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';
import { RoleEntity } from '../role/role.entity.js';

@Index('uq_users_username', ['username'], { unique: true })
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

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'province_id', type: 'varchar', length: 20, nullable: true })
  provinceId: string | null;

  @Column({ name: 'district_id', type: 'varchar', length: 20, nullable: true })
  districtId: string | null;

  @Column({ name: 'ward_id', type: 'varchar', length: 20, nullable: true })
  wardId: string | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @ManyToOne(() => RoleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'fk_users_role' })
  role: RoleEntity;

  @Column({ name: 'enterprise_id', type: 'int', nullable: true })
  enterpriseId: number | null;

  @ManyToOne(() => EnterpriseEntity, { nullable: true, onDelete: 'SET NULL' })
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
