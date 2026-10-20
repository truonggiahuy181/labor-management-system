import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';

export interface SetAuthCookiesParams {
  accessToken: string;
  refreshToken?: string;
  accessExpiresIn?: string | number;
  rememberMe?: boolean;
  refreshMaxAgeMs?: number;
}

@Injectable()
export class AuthCookieService {
  readonly accessTokenName: string;
  readonly refreshTokenName: string;
  private readonly isProduction: boolean;
  private readonly secure: boolean;
  private readonly sameSite: 'lax' | 'strict' | 'none';
  private readonly domain: string | undefined;
  private readonly path: string;

  constructor(private readonly configService: ConfigService) {
    this.accessTokenName = this.configService.get<string>(
      'COOKIE_ACCESS_TOKEN_NAME',
      'access_token',
    );
    this.refreshTokenName = this.configService.get<string>(
      'COOKIE_REFRESH_TOKEN_NAME',
      'refresh_token',
    );

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.isProduction = nodeEnv === 'production';

    // Parse boolean COOKIE_SECURE linh hoạt (hỗ trợ true, 1, false, 0)
    const cookieSecureEnv = this.configService.get<string>('COOKIE_SECURE');
    let isSecure: boolean;
    if (cookieSecureEnv !== undefined && cookieSecureEnv !== '') {
      const normalized = cookieSecureEnv.trim().toLowerCase();
      isSecure = normalized === 'true' || normalized === '1';
    } else {
      isSecure = this.isProduction;
    }

    const sameSiteEnv = this.configService
      .get<string>('COOKIE_SAME_SITE', 'lax')
      .toLowerCase();
    if (sameSiteEnv === 'strict' || sameSiteEnv === 'lax' || sameSiteEnv === 'none') {
      this.sameSite = sameSiteEnv;
    } else {
      this.sameSite = 'lax';
    }

    // BẮT BUỘC: Theo đặc tả RFC 6265bis, nếu SameSite=None thì Secure BẮT BUỘC phải là true.
    // Nếu secure=false với sameSite=none, trình duyệt sẽ drop cookie hoàn toàn.
    if (this.sameSite === 'none') {
      isSecure = true;
    }
    this.secure = isSecure;

    const domainEnv = this.configService.get<string>('COOKIE_DOMAIN');
    this.domain = domainEnv && domainEnv.trim() !== '' ? domainEnv.trim() : undefined;

    this.path = this.configService.get<string>('COOKIE_PATH', '/');
  }

  /**
   * Tạo CookieOptions chuẩn hóa theo cấu hình môi trường
   */
  getCookieOptions(maxAgeMs?: number): CookieOptions {
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: this.path,
    };

    if (this.domain) {
      options.domain = this.domain;
    }

    if (maxAgeMs !== undefined) {
      options.maxAge = maxAgeMs;
    }

    return options;
  }

  /**
   * Chuyển đổi định dạng thời gian (8h, 30d, 15m, 60s) sang milliseconds
   */
  parseDurationToMs(
    duration: string | number | undefined,
    defaultMs = 8 * 60 * 60 * 1000,
  ): number {
    if (typeof duration === 'number') {
      return duration;
    }
    if (!duration || typeof duration !== 'string') {
      return defaultMs;
    }

    const match = duration.trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
      const parsed = parseInt(duration, 10);
      return isNaN(parsed) ? defaultMs : parsed;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return defaultMs;
    }
  }

  /**
   * Thiết lập HttpOnly Cookie cho access_token và refresh_token
   */
  setAuthCookies(res: Response, params: SetAuthCookiesParams): void {
    const accessMaxAgeMs = this.parseDurationToMs(
      params.accessExpiresIn ?? this.configService.get<string>('JWT_EXPIRES_IN', '8h'),
    );

    res.cookie(
      this.accessTokenName,
      params.accessToken,
      this.getCookieOptions(accessMaxAgeMs),
    );

    if (params.refreshToken) {
      const refreshMaxAgeMs =
        params.refreshMaxAgeMs !== undefined
          ? params.refreshMaxAgeMs
          : params.rememberMe
            ? 30 * 24 * 60 * 60 * 1000 // 30 ngày nếu chọn rememberMe
            : 24 * 60 * 60 * 1000; // 1 ngày mặc định

      res.cookie(
        this.refreshTokenName,
        params.refreshToken,
        this.getCookieOptions(refreshMaxAgeMs),
      );
    }
  }

  /**
   * Xóa sạch cookie xác thực khỏi client
   */
  clearAuthCookies(res: Response): void {
    const options = this.getCookieOptions();
    delete options.maxAge;

    res.clearCookie(this.accessTokenName, options);
    res.clearCookie(this.refreshTokenName, options);
  }

  /**
   * Trích xuất Access Token: ưu tiên từ cookie, fallback từ header Authorization Bearer
   */
  extractAccessToken(req: Request): string | null {
    if (req.cookies && req.cookies[this.accessTokenName]) {
      return req.cookies[this.accessTokenName];
    }
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return null;
  }

  /**
   * Trích xuất Refresh Token: ưu tiên từ cookie, fallback từ tham số hoặc body
   */
  extractRefreshToken(req: Request, fallback?: string): string | null {
    if (req.cookies && req.cookies[this.refreshTokenName]) {
      return req.cookies[this.refreshTokenName];
    }
    return fallback || null;
  }
}
