import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../commons/bases/base.entity.js';

@Index(['username'], { unique: true, where: 'deleted_at IS NULL' })
@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ name: 'username' })
  username: string;

  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'dob', type: 'date', nullable: true })
  dob: Date | null;

  @Column({ name: 'gender', type: 'smallint', nullable: true })
  gender: number | null;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string | null;

  @Column({ name: 'phone_number', type: 'varchar', nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'title', type: 'varchar', nullable: true })
  title: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'province_id', type: 'varchar', nullable: true })
  provinceId: string | null;

  @Column({ name: 'district_id', type: 'varchar', nullable: true })
  districtId: string | null;

  @Column({ name: 'ward_id', type: 'varchar', nullable: true })
  wardId: string | null;

  @Column({ name: 'address', type: 'varchar', nullable: true })
  address: string | null;

  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @Column({ name: 'enterprise_id', type: 'int', nullable: true })
  enterpriseId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // ─── Reset Password ──────────────────────────────────────────────
  @Exclude()
  @Column({ name: 'reset_password_token', type: 'varchar', nullable: true })
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
  @Column({ name: 'email_change_otp', type: 'varchar', nullable: true })
  emailChangeOtp: string | null;

  @Exclude()
  @Column({ name: 'email_change_otp_expires', type: 'timestamp', nullable: true })
  emailChangeOtpExpires: Date | null;

  // Email mới đang chờ xác nhận OTP
  @Exclude()
  @Column({ name: 'email_change_pending', type: 'varchar', nullable: true })
  emailChangePending: string | null;
}
