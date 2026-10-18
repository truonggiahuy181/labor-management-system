import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { UserService } from '../user/user.service.js';
import {
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailOtpDto,
  ConfirmEmailChangeDto,
} from './dto/auth.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';


const OTP_EXPIRY_MINUTES = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  // ─── 1. ĐĂNG NHẬP ───────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userService.findByUsername(dto.username);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại.',
      );
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
    };

    const expiresIn = dto.rememberMe
      ? '30d'
      : this.configService.get<string>('JWT_EXPIRES_IN', '8h');
    const accessToken = this.jwtService.sign(payload, { expiresIn } as any);

    return {
      accessToken,
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
      },
    };
  }

  // ─── 2. ĐĂNG XUẤT ───────────────────────────────────────────────────────────
  async logout(_userId: number) {
    return {
      message: 'Đăng xuất thành công.',
      action: 'CLEAR_TOKEN',
    };
  }

  // ─── 3. ĐỔI MẬT KHẨU (khi đã đăng nhập) ────────────────────────────────────
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const currentPass = dto.currentPassword;
    if (!currentPass) {
      throw new BadRequestException('Mật khẩu hiện tại không được để trống');
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException(
        'Mật khẩu mới và xác nhận mật khẩu không khớp',
      );
    }

    const user = await this.userService.findOneOrFail({ where: { id: userId } });

    const isCurrentPasswordValid = await argon2.verify(
      user.passwordHash,
      currentPass,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    const isSamePassword = await argon2.verify(user.passwordHash, dto.newPassword);
    if (isSamePassword) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng mật khẩu hiện tại',
      );
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    const now = new Date();

    await this.userService.update(userId, {
      passwordHash: newPasswordHash,
      passwordChangedAt: now,
      updatedBy: userId,
    } as any);

    return {
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
      action: 'FORCE_LOGOUT',
    };
  }

  // ─── 4a. QUÊN MẬT KHẨU – BƯỚC 1: Nhập email → Gửi OTP ──────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    // Email format đã được @IsEmail() trong DTO validate → chỉ cần kiểm tra tồn tại
    const user = await this.userService.findByEmail(dto.email);

    // Theo nghiệp vụ: thông báo rõ ràng nếu email chưa đăng ký
    if (!user || !user.isActive) {
      throw new NotFoundException(
        'Email chưa được đăng ký. Xin vui lòng thử lại.',
      );
    }

    // Sinh OTP 6 chữ số và tính thời gian hết hạn
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Lưu OTP vào các trường reset_password_token / reset_password_expires
    await this.userService.update(user.id, {
      resetPasswordToken: otp,
      resetPasswordExpires: expiresAt,
    } as any);

    // Gửi email OTP
    await this.sendForgotPasswordOtpEmail(
      user.email!,
      user.username,
      user.fullName,
      otp,
    );

    return { message: 'Gửi email thành công.' };
  }

  // ─── 4b. QUÊN MẬT KHẨU – BƯỚC 2: Xác nhận OTP + Đặt mật khẩu mới ──────────
  async resetPasswordWithOtp(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException(
        'Mật khẩu mới và xác nhận mật khẩu không khớp',
      );
    }

    const user = await this.userService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new NotFoundException(
        'Email chưa được đăng ký. Xin vui lòng thử lại.',
      );
    }

    // Kiểm tra OTP tồn tại
    if (!user.resetPasswordToken || !user.resetPasswordExpires) {
      throw new BadRequestException(
        'Chưa có yêu cầu khôi phục mật khẩu. Vui lòng bắt đầu lại.',
      );
    }

    // Kiểm tra OTP hết hạn
    if (new Date() > user.resetPasswordExpires) {
      // Xóa OTP đã hết hạn
      await this.userService.update(user.id, {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      } as any);
      throw new BadRequestException(
        `Mã OTP đã hết hạn sau ${OTP_EXPIRY_MINUTES} phút. Vui lòng yêu cầu mã mới.`,
      );
    }

    // Kiểm tra OTP khớp
    if (user.resetPasswordToken !== dto.otp) {
      throw new BadRequestException('Mã OTP không đúng. Vui lòng kiểm tra lại.');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    const now = new Date();

    // Cập nhật mật khẩu mới, xóa OTP, ghi timestamp để invalidate token cũ
    await this.userService.update(user.id, {
      passwordHash: newPasswordHash,
      passwordChangedAt: now,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    } as any);

    return {
      message:
        'Khôi phục mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
      action: 'REDIRECT_TO_LOGIN',
    };
  }

  // ─── 5. THAY ĐỔI EMAIL – BƯỚC 1: Gửi OTP ───────────────────────────────────
  async requestEmailChangeOtp(userId: number) {
    const user = await this.userService.findOneOrFail({ where: { id: userId } });

    if (!user.email) {
      throw new BadRequestException(
        'Tài khoản chưa có email. Vui lòng liên hệ quản trị viên.',
      );
    }

    const otp = this.generateOtp();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.userService.update(userId, {
      emailChangeOtp: otp,
      emailChangeOtpExpires: expires,
    } as any);

    await this.sendEmailOtpEmail(user.email, user.username, user.fullName, otp);

    return {
      message: `Mã OTP đã được gửi về email ${this.maskEmail(user.email)}. Có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút.`,
      otpExpiryMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  // ─── 6. THAY ĐỔI EMAIL – BƯỚC 2: Xác minh OTP ───────────────────────────────
  async verifyEmailOtp(userId: number, dto: VerifyEmailOtpDto) {
    const user = await this.userService.findOneOrFail({ where: { id: userId } });

    if (!user.emailChangeOtp || !user.emailChangeOtpExpires) {
      throw new BadRequestException(
        'Chưa có yêu cầu thay đổi email. Vui lòng bắt đầu lại.',
      );
    }

    if (new Date() > user.emailChangeOtpExpires) {
      throw new BadRequestException(
        `Mã OTP đã hết hạn sau ${OTP_EXPIRY_MINUTES} phút. Vui lòng yêu cầu mã mới.`,
      );
    }

    if (user.emailChangeOtp !== dto.otp) {
      throw new BadRequestException('Mã OTP không đúng. Vui lòng thử lại.');
    }

    return {
      message: 'Xác minh OTP thành công. Vui lòng nhập email mới.',
      verified: true,
    };
  }

  // ─── 7. THAY ĐỔI EMAIL – BƯỚC 3: Xác nhận email mới ────────────────────────
  async confirmEmailChange(userId: number, dto: ConfirmEmailChangeDto) {
    const user = await this.userService.findOneOrFail({ where: { id: userId } });

    if (!user.emailChangeOtp || !user.emailChangeOtpExpires) {
      throw new BadRequestException(
        'Phiên thay đổi email không hợp lệ. Vui lòng bắt đầu lại.',
      );
    }

    if (new Date() > user.emailChangeOtpExpires) {
      throw new BadRequestException(
        `Mã OTP đã hết hạn sau ${OTP_EXPIRY_MINUTES} phút. Vui lòng yêu cầu mã mới.`,
      );
    }

    if (user.emailChangeOtp !== dto.otp) {
      throw new BadRequestException('Mã OTP không hợp lệ.');
    }

    if (user.email === dto.newEmail) {
      throw new BadRequestException(
        'Email mới không được trùng với email hiện tại.',
      );
    }

    const existingUser = await this.userService.findByEmail(dto.newEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException(
        'Email này đã được sử dụng bởi tài khoản khác.',
      );
    }

    await this.userService.update(userId, {
      email: dto.newEmail,
      emailChangeOtp: null,
      emailChangeOtpExpires: null,
      updatedBy: userId,
    } as any);

    return { message: 'Cập nhật email thành công.' };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

  private generateOtp(): string {
    // Dùng crypto để đảm bảo tính ngẫu nhiên bảo mật
    const num = Number(crypto.randomBytes(3).readUIntBE(0, 3)) % 1_000_000;
    return num.toString().padStart(6, '0');
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const masked =
      local.length > 2
        ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
        : local[0] + '*';
    return `${masked}@${domain}`;
  }

  private getMailTransporter() {
    return nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: Number(this.configService.get('MAIL_PORT', 587)),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  /**
   * Email quên mật khẩu – gửi OTP
   * Template bao gồm: Logo, Lời chào (username), OTP, Thời gian hiệu lực
   */
  private async sendForgotPasswordOtpEmail(
    email: string,
    username: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    const transporter = this.getMailTransporter();
    const appName = this.configService.get<string>('APP_NAME', 'Hệ thống Quản lý Lao động');
    const logoUrl = this.configService.get<string>(
      'MAIL_LOGO_URL',
      'https://i.imgur.com/placeholder-logo.png',
    );
    // Thời gian hết hạn lấy từ hằng số – LUÔN khớp với logic backend
    const expiryText = `${OTP_EXPIRY_MINUTES} phút`;
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const expiresAtFormatted = expiresAt.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    await transporter.sendMail({
      from: `"${appName}" <${this.configService.get<string>('MAIL_USER')}>`,
      to: email,
      subject: `[${appName}] Mã xác thực khôi phục mật khẩu`,
      html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Khôi phục mật khẩu</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER / LOGO -->
          <tr>
            <td align="center"
                style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);padding:32px 40px;">
              <img src="${logoUrl}"
                   alt="${appName}"
                   height="60"
                   style="display:block;max-width:240px;object-fit:contain;"
                   onerror="this.style.display='none'" />
              <p style="margin:12px 0 0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">
                ${appName}
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 48px 32px;">

              <!-- Tiêu đề -->
              <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">
                Khôi phục mật khẩu
              </h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
                Yêu cầu đặt lại mật khẩu của bạn đã được nhận
              </p>

              <!-- Lời chào -->
              <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                Xin chào <strong style="color:#1a73e8;">${fullName}</strong>
                (<span style="color:#6b7280;font-style:italic;">@${username}</span>),
              </p>
              <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6;">
                Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.
                Vui lòng sử dụng mã xác thực dưới đây để tiếp tục:
              </p>

              <!-- Khung OTP -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);
                             border:2px dashed #93c5fd;border-radius:12px;padding:28px;">
                    <p style="margin:0 0 8px;color:#1e40af;font-size:13px;
                               font-weight:600;letter-spacing:2px;text-transform:uppercase;">
                      MÃ XÁC THỰC OTP
                    </p>
                    <p style="margin:0;color:#1a73e8;font-size:48px;font-weight:800;
                               letter-spacing:12px;font-family:'Courier New',monospace;">
                      ${otp}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Thông tin thời gian hiệu lực -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background-color:#fef3c7;border-left:4px solid #f59e0b;
                             border-radius:0 8px 8px 0;padding:14px 16px;">
                    <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
                      ⏱️ Mã OTP có hiệu lực trong <strong>${expiryText}</strong>
                      và sẽ hết hạn lúc <strong>${expiresAtFormatted}</strong>.
                      Vui lòng không chia sẻ mã này với bất kỳ ai.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Hướng dẫn -->
              <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
                <strong>Các bước thực hiện:</strong>
              </p>
              <ol style="margin:0 0 28px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
                <li>Quay lại trang khôi phục mật khẩu</li>
                <li>Nhập mã OTP: <strong>${otp}</strong></li>
                <li>Nhập mật khẩu mới và xác nhận</li>
                <li>Bấm <strong>"Khôi phục mật khẩu"</strong></li>
              </ol>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;
                       padding:24px 48px;text-align:center;">
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;line-height:1.6;">
                Nếu bạn <strong>không</strong> thực hiện yêu cầu này, vui lòng bỏ qua email
                và liên hệ quản trị viên ngay để bảo mật tài khoản.
              </p>
              <p style="margin:0;color:#d1d5db;font-size:11px;">
                © ${new Date().getFullYear()} ${appName}. Email tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });
  }

  /**
   * Email xác thực thay đổi email – gửi OTP
   */
  private async sendEmailOtpEmail(
    email: string,
    username: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    const transporter = this.getMailTransporter();
    const appName = this.configService.get<string>('APP_NAME', 'Hệ thống Quản lý Lao động');
    const logoUrl = this.configService.get<string>(
      'MAIL_LOGO_URL',
      'https://i.imgur.com/placeholder-logo.png',
    );
    const expiryText = `${OTP_EXPIRY_MINUTES} phút`;

    await transporter.sendMail({
      from: `"${appName}" <${this.configService.get<string>('MAIL_USER')}>`,
      to: email,
      subject: `[${appName}] Mã xác thực thay đổi địa chỉ Email`,
      html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Xác thực thay đổi Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER / LOGO -->
          <tr>
            <td align="center"
                style="background:linear-gradient(135deg,#0f766e 0%,#065f46 100%);padding:32px 40px;">
              <img src="${logoUrl}" alt="${appName}" height="60"
                   style="display:block;max-width:240px;object-fit:contain;"
                   onerror="this.style.display='none'" />
              <p style="margin:12px 0 0;color:#ffffff;font-size:18px;font-weight:700;">
                ${appName}
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 48px 32px;">
              <h2 style="margin:0 0 24px;color:#1a1a2e;font-size:22px;">
                Xác thực thay đổi địa chỉ Email
              </h2>
              <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                Xin chào <strong style="color:#0f766e;">${fullName}</strong>
                (<span style="color:#6b7280;font-style:italic;">@${username}</span>),
              </p>
              <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6;">
                Bạn vừa yêu cầu thay đổi địa chỉ email trên hệ thống.
                Vui lòng dùng mã OTP dưới đây để xác nhận:
              </p>

              <!-- Khung OTP -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);
                             border:2px dashed #86efac;border-radius:12px;padding:28px;">
                    <p style="margin:0 0 8px;color:#14532d;font-size:13px;
                               font-weight:600;letter-spacing:2px;text-transform:uppercase;">
                      MÃ XÁC THỰC OTP
                    </p>
                    <p style="margin:0;color:#15803d;font-size:48px;font-weight:800;
                               letter-spacing:12px;font-family:'Courier New',monospace;">
                      ${otp}
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#fef3c7;border-left:4px solid #f59e0b;
                             border-radius:0 8px 8px 0;padding:14px 16px;">
                    <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
                      ⏱️ Mã có hiệu lực trong <strong>${expiryText}</strong>.
                      Vui lòng không chia sẻ mã này với bất kỳ ai.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;
                       padding:24px 48px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
                Tài khoản của bạn vẫn an toàn.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });
  }
}
