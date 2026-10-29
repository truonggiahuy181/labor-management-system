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
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { RedisService } from '../../commons/redis/redis.service.js';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { canAuthenticate } from './auth-access.util.js';
import { join } from 'node:path';

const OTP_EXPIRY_MINUTES = 5;
// Phải chờ bao lâu mới được gửi lại OTP (khớp RESEND_SECONDS ở frontend)
const OTP_RESEND_SECONDS = 60;
// Số lần nhập sai tối đa trước khi OTP bị hủy
const OTP_MAX_ATTEMPTS = 5;

// Thời hạn refresh token (30 ngày)
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) { }

  // ─── 1. ĐĂNG NHẬP ───────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userService.findForAuthenticationByUsername(
      dto.username,
    );

    const isPasswordValid =
      !!user && (await argon2.verify(user.passwordHash, dto.password));
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: ErrorCode.WRONG_PASSWORD,
        message: 'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại.',
      });
    }

    // Chỉ báo tài khoản bị vô hiệu hóa sau khi mật khẩu đúng để tránh dò tài khoản
    if (!canAuthenticate(user)) {
      throw new UnauthorizedException({
        code: ErrorCode.ACCOUNT_INACTIVE,
        message:
          'Tài khoản của bạn đã ngừng hoạt động. Vui lòng liên hệ quản trị viên.',
      });
    }

    const jti = crypto.randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      jti,
    };

    // Access Token luôn giữ thời hạn ngắn cấu hình trong JWT_EXPIRES_IN (không kéo dài 30 ngày)
    // Chỉ có refresh token mới kéo dài theo rememberMe để tăng tính an toàn
    const accessExpiresIn = this.configService.get<string>(
      'JWT_EXPIRES_IN',
      '8h',
    );
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessExpiresIn,
    } as any);

    // Tạo refresh token ngẫu nhiên và lưu hash vào Redis
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const refreshTtl = dto.rememberMe
      ? REFRESH_TOKEN_EXPIRY_SECONDS
      : 24 * 60 * 60; // 30d hoặc 1d
    await this.redisService.saveRefreshToken(
      user.id,
      refreshTokenHash,
      refreshTtl,
    );

    const avatarUrl = await this.userService.resolveAvatarUrl(
      user.avatarObjectKey,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresInSeconds: refreshTtl,
      rememberMe: dto.rememberMe,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        avatarObjectKey: user.avatarObjectKey,
        avatarUrl,
        isActive: user.isActive,
      },
    };
  }

  // ─── 1a. THÔNG TIN NGƯỜI DÙNG ĐANG ĐĂNG NHẬP ─────────────────────────────────
  async getMe(userId: number) {
    const user = await this.userService.findOneOrFail({
      where: { id: userId },
    });
    const avatarUrl = await this.userService.resolveAvatarUrl(
      user.avatarObjectKey,
    );
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
      enterpriseId: user.enterpriseId,
      avatarObjectKey: user.avatarObjectKey,
      avatarUrl,
      isActive: user.isActive,
    };
  }

  // ─── 1b. LÀM MỚI ACCESS TOKEN ────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    const incomingHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 1. Kiểm tra cache grace period (15s): nếu token này vừa được xoay vòng bởi request trước đó:
    const cachedRotation =
      await this.redisService.getRotatedTokenResult(incomingHash);
    if (cachedRotation) {
      try {
        const parsed = JSON.parse(cachedRotation);
        // BẢO VỆ CHỐNG REPLAY VÀ RÒ RỈ CREDENTIAL MỚI:
        // Request thứ hai sử dụng cùng token cũ trong grace period CHỈ nhận accessToken mới để tiếp tục gọi API,
        // TUYỆT ĐỐI KHÔNG cấp lại raw refreshToken mới từ cache.
        // Điều này ngăn chặn kẻ trộm token cũ dùng grace period để chiếm đoạt refreshToken mới của nạn nhân.
        return {
          accessToken: parsed.accessToken,
          expiresIn: parsed.expiresIn,
        };
      } catch {
        // Bỏ qua lỗi parse JSON nếu có
      }
    }

    // 2. Kiểm tra token có hợp lệ và còn hoạt động không
    const userId =
      await this.redisService.getUserIdByRefreshToken(incomingHash);
    if (!userId) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
      );
    }

    // 3. Khóa nguyên tử ngắn hạn (5s) có gắn Owner ID ngẫu nhiên để chống race condition
    const lockOwner = crypto.randomUUID();
    const lockAcquired = await this.redisService.acquireRotationLock(
      incomingHash,
      lockOwner,
      5,
    );
    if (!lockAcquired) {
      // Một request khác đang xoay vòng token này -> chờ ngắn và đọc kết quả xoay vòng đã cache
      await new Promise((resolve) => setTimeout(resolve, 200));
      const retryCached =
        await this.redisService.getRotatedTokenResult(incomingHash);
      if (retryCached) {
        const parsed = JSON.parse(retryCached);
        return {
          accessToken: parsed.accessToken,
          expiresIn: parsed.expiresIn,
        };
      }
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
      );
    }

    try {
      const user = await this.userService.findForAuthenticationById(userId);
      if (!canAuthenticate(user)) {
        await this.redisService.deleteRefreshToken(userId);
        throw new UnauthorizedException(
          'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
        );
      }

      // Bảo tồn thời gian sống còn lại của phiên làm việc (nếu người dùng đăng nhập bằng rememberMe)
      const remainingTtl = await this.redisService.getRefreshTokenTtl(userId);
      const refreshTtl = remainingTtl > 0 ? remainingTtl : 24 * 60 * 60;

      // Xoay vòng: tạo cặp token mới
      const jti = crypto.randomUUID();
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        roleId: user.roleId,
        jti,
      };

      const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '8h');
      const newAccessToken = this.jwtService.sign(payload, {
        expiresIn,
      } as any);

      const newRefreshToken = crypto.randomBytes(40).toString('hex');
      const newRefreshTokenHash = crypto
        .createHash('sha256')
        .update(newRefreshToken)
        .digest('hex');

      // Thu hồi ngay lập tức token cũ và lưu token mới
      await this.redisService.saveRefreshToken(
        user.id,
        newRefreshTokenHash,
        refreshTtl,
        incomingHash,
      );

      // Lưu kết quả xoay vòng vào cache grace period 15 giây cho token cũ.
      // CHỈ lưu accessToken và expiresIn, TUYỆT ĐỐI KHÔNG lưu refreshToken để chống replay/token leakage.
      await this.redisService.saveRotatedTokenResult(
        incomingHash,
        JSON.stringify({
          accessToken: newAccessToken,
          expiresIn,
        }),
        15,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        refreshExpiresInSeconds: refreshTtl,
      };
    } finally {
      await this.redisService.releaseRotationLock(incomingHash, lockOwner);
    }
  }

  // ─── 2. ĐĂNG XUẤT ───────────────────────────────────────────────────────────
  async logout(
    userId?: number | null,
    accessToken?: string | null,
    refreshToken?: string | null,
  ) {
    // 1. Nếu có accessToken: BẮT BUỘC xác minh chữ ký (cho phép token hết hạn)
    // TUYỆT ĐỐI không dùng jwtService.decode không xác thực để tránh kẻ tấn công giả mạo claims sub/jti
    if (accessToken) {
      let verifiedPayload: (JwtPayload & { exp?: number }) | null = null;
      try {
        verifiedPayload = this.jwtService.verify(accessToken, {
          ignoreExpiration: true,
        }) as (JwtPayload & { exp?: number }) | null;
      } catch {
        // Token giả mạo hoặc sai chữ ký -> Bỏ qua, không tin tưởng claims
        verifiedPayload = null;
      }

      if (verifiedPayload) {
        if (!userId && verifiedPayload.sub) {
          userId = verifiedPayload.sub;
        }

        // Blacklist access token vào Redis đến khi hết hạn
        if (verifiedPayload.jti && verifiedPayload.exp) {
          const ttl = verifiedPayload.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await this.redisService.blacklistAccessToken(
              verifiedPayload.jti,
              ttl,
            );
          }
        }
      }
    }

    // 2. Nếu chưa có userId nhưng có refreshToken: tra cứu userId từ hash ngẫu nhiên trong Redis
    if (!userId && refreshToken) {
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      userId =
        await this.redisService.getUserIdByRefreshToken(refreshTokenHash);
    }

    // 3. Xóa refresh token khỏi Redis nếu xác định được userId hợp lệ
    if (userId) {
      await this.redisService.deleteRefreshToken(userId);
    }

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
      throw new BadRequestException({
        code: ErrorCode.PASSWORD_MISMATCH,
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp',
      });
    }

    const user = await this.userService.findOneOrFail({
      where: { id: userId },
    });

    const isCurrentPasswordValid = await argon2.verify(
      user.passwordHash,
      currentPass,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException({
        code: ErrorCode.WRONG_OLD_PASSWORD,
        message: 'Mật khẩu hiện tại không đúng',
      });
    }

    const isSamePassword = await argon2.verify(
      user.passwordHash,
      dto.newPassword,
    );
    if (isSamePassword) {
      throw new BadRequestException({
        code: ErrorCode.SAME_PASSWORD,
        message: 'Mật khẩu mới không được trùng mật khẩu hiện tại',
      });
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    const now = new Date();

    await this.userService.update(userId, {
      passwordHash: newPasswordHash,
      passwordChangedAt: now,
      updatedBy: userId,
    } as any);

    // Thu hồi refresh token trong Redis để bắt buộc đăng nhập lại trên mọi thiết bị
    await this.redisService.deleteRefreshToken(userId);

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
      throw new NotFoundException({
        code: ErrorCode.EMAIL_NOT_FOUND,
        message: 'Email chưa được đăng ký. Xin vui lòng thử lại.',
      });
    }

    await this.assertOtpCooldown(`fp:${user.id}`);

    // Sinh OTP 6 chữ số và tính thời gian hết hạn
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Lưu OTP vào các trường reset_password_token / reset_password_expires
    await this.userService.update(user.id, {
      resetPasswordToken: otp,
      resetPasswordExpires: expiresAt,
    } as any);
    await this.redisService.clearOtpAttempts(`fp:${user.id}`);

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
    // confirmNewPassword không bắt buộc (frontend tự kiểm tra), chỉ so sánh khi có gửi lên
    if (
      dto.confirmNewPassword !== undefined &&
      dto.newPassword !== dto.confirmNewPassword
    ) {
      throw new BadRequestException({
        code: ErrorCode.PASSWORD_MISMATCH,
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp',
      });
    }

    const user = await this.userService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new NotFoundException({
        code: ErrorCode.EMAIL_NOT_FOUND,
        message: 'Email chưa được đăng ký. Xin vui lòng thử lại.',
      });
    }

    await this.assertOtp(
      `fp:${user.id}`,
      user.resetPasswordToken,
      user.resetPasswordExpires,
      dto.otp,
      () =>
        this.userService.update(user.id, {
          resetPasswordToken: null,
          resetPasswordExpires: null,
        } as any),
    );

    const newPasswordHash = await argon2.hash(dto.newPassword);
    const now = new Date();

    // Cập nhật mật khẩu mới, xóa OTP, ghi timestamp để invalidate token cũ
    await this.userService.update(user.id, {
      passwordHash: newPasswordHash,
      passwordChangedAt: now,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    } as any);

    // Thu hồi refresh token trong Redis để hủy bỏ các phiên đăng nhập cũ
    await this.redisService.deleteRefreshToken(user.id);
    await this.redisService.clearOtpAttempts(`fp:${user.id}`);

    return {
      message:
        'Khôi phục mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
      action: 'REDIRECT_TO_LOGIN',
    };
  }

  // ─── 5. THAY ĐỔI EMAIL – BƯỚC 1: Gửi OTP ───────────────────────────────────
  async requestEmailChangeOtp(userId: number) {
    const user = await this.userService.findOneOrFail({
      where: { id: userId },
    });

    if (!user.email) {
      throw new BadRequestException(
        'Tài khoản chưa có email. Vui lòng liên hệ quản trị viên.',
      );
    }

    await this.assertOtpCooldown(`ec:${userId}`);

    const otp = this.generateOtp();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.userService.update(userId, {
      emailChangeOtp: otp,
      emailChangeOtpExpires: expires,
    } as any);
    await this.redisService.clearOtpAttempts(`ec:${userId}`);

    await this.sendEmailOtpEmail(user.email, user.username, user.fullName, otp);

    return {
      message: `Mã OTP đã được gửi về email ${this.maskEmail(user.email)}. Có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút.`,
      otpExpiryMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  // ─── 6. THAY ĐỔI EMAIL – BƯỚC 2: Xác minh OTP ───────────────────────────────
  async verifyEmailOtp(userId: number, dto: VerifyEmailOtpDto) {
    const user = await this.userService.findOneOrFail({
      where: { id: userId },
    });

    await this.assertEmailChangeOtp(
      userId,
      user.emailChangeOtp,
      user.emailChangeOtpExpires,
      dto.otp,
    );

    return {
      message: 'Xác minh OTP thành công. Vui lòng nhập email mới.',
      verified: true,
    };
  }

  // ─── 7. THAY ĐỔI EMAIL – BƯỚC 3: Xác nhận email mới ────────────────────────
  async confirmEmailChange(userId: number, dto: ConfirmEmailChangeDto) {
    const user = await this.userService.findOneOrFail({
      where: { id: userId },
    });

    await this.assertEmailChangeOtp(
      userId,
      user.emailChangeOtp,
      user.emailChangeOtpExpires,
      dto.otp,
    );

    if (user.email === dto.newEmail) {
      throw new BadRequestException(
        'Email mới không được trùng với email hiện tại.',
      );
    }

    const existingUser = await this.userService.findByEmail(dto.newEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_EXISTS,
        message: 'Email này đã được sử dụng bởi tài khoản khác.',
      });
    }

    await this.userService.update(userId, {
      email: dto.newEmail,
      emailChangeOtp: null,
      emailChangeOtpExpires: null,
      updatedBy: userId,
    } as any);
    await this.redisService.clearOtpAttempts(`ec:${userId}`);

    return { message: 'Cập nhật email thành công.' };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

  // Chặn gửi lại OTP trong vòng OTP_RESEND_SECONDS giây
  private async assertOtpCooldown(scope: string): Promise<void> {
    const allowed = await this.redisService.acquireOtpCooldown(
      scope,
      OTP_RESEND_SECONDS,
    );
    if (!allowed) {
      throw new BadRequestException({
        code: ErrorCode.OTP_RESEND_TOO_SOON,
        message: `Vui lòng đợi ${OTP_RESEND_SECONDS} giây trước khi gửi lại mã.`,
      });
    }
  }

  /**
   * Kiểm tra OTP: đã yêu cầu chưa, còn hạn không, có khớp không.
   * Sai quá OTP_MAX_ATTEMPTS lần thì hủy OTP (gọi `invalidate`) để chống dò mã.
   */
  private async assertOtp(
    scope: string,
    storedOtp: string | null,
    expiresAt: Date | null,
    inputOtp: string,
    invalidate: () => Promise<unknown>,
  ): Promise<void> {
    if (!storedOtp || !expiresAt) {
      throw new BadRequestException({
        code: ErrorCode.OTP_NOT_REQUESTED,
        message: 'Chưa có yêu cầu gửi mã OTP. Vui lòng bắt đầu lại.',
      });
    }

    if (new Date() > expiresAt) {
      await invalidate();
      throw new BadRequestException({
        code: ErrorCode.OTP_EXPIRED,
        message: `Mã OTP đã hết hạn sau ${OTP_EXPIRY_MINUTES} phút. Vui lòng yêu cầu mã mới.`,
      });
    }

    if (storedOtp !== inputOtp) {
      const attempts = await this.redisService.incrementOtpAttempts(
        scope,
        OTP_EXPIRY_MINUTES * 60,
      );
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await invalidate();
        await this.redisService.clearOtpAttempts(scope);
        throw new BadRequestException({
          code: ErrorCode.OTP_TOO_MANY_ATTEMPTS,
          message: 'Nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
        });
      }
      throw new BadRequestException({
        code: ErrorCode.OTP_INVALID,
        message: 'Mã OTP không đúng. Vui lòng kiểm tra lại.',
      });
    }
  }

  private assertEmailChangeOtp(
    userId: number,
    storedOtp: string | null,
    expiresAt: Date | null,
    inputOtp: string,
  ): Promise<void> {
    return this.assertOtp(`ec:${userId}`, storedOtp, expiresAt, inputOtp, () =>
      this.userService.update(userId, {
        emailChangeOtp: null,
        emailChangeOtpExpires: null,
      } as any),
    );
  }

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
    const appName = this.configService.get<string>(
      'APP_NAME',
      'Hệ thống Quản lý Lao động',
    );
    const logoUrl = this.configService.get<string>(
      'MAIL_LOGO_URL',
      'cid:vna-group-logo',
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Khôi phục mật khẩu</title>
</head>

<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="width:100%;background-color:#ffffff;"
  >
    <tr>
      <td align="center" style="padding:0;">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width:100%;max-width:700px;background-color:#ffffff;border:1px solid #e5e7eb;"
        >
          <!-- LOGO -->
          <tr>
            <td align="center" style="padding:12px 12px 0;">
              <img
                src="${logoUrl}"
                height="48"
                style="display:block;width:auto;height:48px;max-width:180px;object-fit:contain;border:0;"
              />
              <p
                style="margin:2px 0 0;color:#111111;font-size:13px;line-height:18px;font-weight:700;text-align:center;"
              >
              </p>
            </td>
          </tr>

          <!-- NỘI DUNG EMAIL -->
          <tr>
            <td style="padding:12px 13px 22px;">

              <h1
                style="margin:0 0 28px;color:#111111;font-size:26px;line-height:1.35;font-weight:700;"
              >
                Xin chào, ${fullName}
              </h1>

              <p
                style="margin:0 0 7px;color:#222222;font-size:16px;line-height:1.5;"
              >
                Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản
                <strong>${username}</strong>. Dưới đây là mã OTP của bạn:
                <strong style="font-size:17px;">${otp}</strong>
              </p>

              <p
                style="margin:0 0 7px;color:#222222;font-size:16px;line-height:1.5;"
              >
                Lưu ý quan trọng: Mã OTP có hiệu lực trong
                <strong>${expiryText}</strong>
              </p>

              <p
                style="margin:0 0 7px;color:#222222;font-size:16px;line-height:1.5;"
              >
                Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên hỗ trợ.
              </p>

              <p
                style="margin:0;color:#222222;font-size:16px;line-height:1.5;"
              >
                Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.
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
      attachments: [
        {
          filename: 'vna-group-logo.png',
          path: join(
            process.cwd(),
            'assets',
            'vna-group-logo.png',
          ),
          cid: 'vna-group-logo',
          contentType: 'image/png',
          contentDisposition: 'inline',
        },
      ],
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
    const appName = this.configService.get<string>(
      'APP_NAME',
      'Hệ thống Quản lý Lao động',
    );
    const logoUrl = this.configService.get<string>(
      'MAIL_LOGO_URL',
      'cid:vna-group-logo',
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xác thực thay đổi Email</title>
</head>

<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="width:100%;background-color:#ffffff;"
  >
    <tr>
      <td align="center" style="padding:0;">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width:100%;max-width:700px;background-color:#ffffff;border:1px solid #e5e7eb;"
        >

          <!-- LOGO -->
          <tr>
            <td align="center" style="padding:12px 12px 0;">
              <img
                src="${logoUrl}"
                height="48"
                style="display:block;width:auto;height:48px;max-width:180px;object-fit:contain;border:0;"
              />

              <p
                style="margin:2px 0 0;color:#111111;font-size:13px;line-height:18px;font-weight:700;text-align:center;"
              >
              </p>
            </td>
          </tr>

          <!-- NỘI DUNG EMAIL -->
          <tr>
            <td style="padding:12px 13px 22px;">

              <h1
                style="margin:0 0 28px;color:#111111;font-size:26px;line-height:1.35;font-weight:700;"
              >
                Xin chào, ${fullName}
              </h1>

              <p
                style="margin:0 0 7px;color:#222222;font-size:16px;line-height:1.5;"
              >
                Bạn vừa yêu cầu thay đổi địa chỉ email cho tài khoản
                <strong>${username}</strong>.
                Dưới đây là mã OTP để xác nhận thay đổi email của bạn:
                <strong style="font-size:17px;">${otp}</strong>
              </p>

              <p
                style="margin:0 0 7px;color:#222222;font-size:16px;line-height:1.5;"
              >
                Lưu ý quan trọng: Mã OTP có hiệu lực trong
                <strong>${expiryText}</strong>.
              </p>

              <p
                style="margin:0 0 7px;color:#222222;font-size:16px;line-height:1.5;"
              >
                Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên hỗ trợ.
              </p>

              <p
                style="margin:0;color:#222222;font-size:16px;line-height:1.5;"
              >
                Nếu bạn không yêu cầu thay đổi địa chỉ email,
                vui lòng bỏ qua email này.
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
      attachments: [
        {
          filename: 'vna-group-logo.png',
          path: join(
            process.cwd(),
            'assets',
            'vna-group-logo.png',
          ),
          cid: 'vna-group-logo',
          contentType: 'image/png',
          contentDisposition: 'inline',
        },
      ],
    });
  }
}
