import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];
  private readonly accessTokenCookieName: string;
  private readonly refreshTokenCookieName: string;

  constructor(private readonly configService: ConfigService) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );

    this.allowedOrigins = frontendUrl
      .split(',')
      .map((url) => url.trim().replace(/\/$/, '').toLowerCase())
      .filter(Boolean);

    this.accessTokenCookieName = this.configService.get<string>(
      'COOKIE_ACCESS_TOKEN_NAME',
      'access_token',
    );
    this.refreshTokenCookieName = this.configService.get<string>(
      'COOKIE_REFRESH_TOKEN_NAME',
      'refresh_token',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method?.toUpperCase();

    // 1. Các phương thức an toàn (Safe Methods) không làm thay đổi trạng thái hệ thống
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(method)) {
      return true;
    }

    // 2. Kiểm tra xem request có sử dụng Cookie Authentication không
    const hasAccessTokenCookie =
      typeof request.cookies?.[this.accessTokenCookieName] === 'string' &&
      request.cookies[this.accessTokenCookieName].trim().length > 0;
    const hasRefreshTokenCookie =
      typeof request.cookies?.[this.refreshTokenCookieName] === 'string' &&
      request.cookies[this.refreshTokenCookieName].trim().length > 0;

    const hasAuthCookie = hasAccessTokenCookie || hasRefreshTokenCookie;

    // Nếu request KHÔNG có cookie xác thực (ví dụ endpoint công khai, hoặc request API dùng Bearer header),
    // cơ chế CSRF không áp dụng vì trình duyệt không tự động gửi custom Authorization header chéo tên miền.
    // LƯU Ý: Nếu request có Bearer header NHƯNG CŨNG CÓ Cookie, CSRF vẫn PHẢI được kiểm tra vì Cookie là nguồn ưu tiên.
    if (!hasAuthCookie) {
      return true;
    }

    // 3. Đối với request thay đổi dữ liệu có đính kèm Cookie: Xác minh Origin / Referer theo khuyến nghị OWASP
    const originHeader = request.headers['origin'];
    const refererHeader = request.headers['referer'];

    const origin = typeof originHeader === 'string' ? originHeader : undefined;
    let refererOrigin: string | undefined;

    if (typeof refererHeader === 'string') {
      try {
        const parsed = new URL(refererHeader);
        refererOrigin = parsed.origin;
      } catch {
        // Referer không phải URL hợp lệ
      }
    }

    const requestOrigin = (origin || refererOrigin)?.toLowerCase().replace(/\/$/, '');

    // Cho phép nếu requestOrigin nằm trong danh sách frontend origins được cấu hình
    if (requestOrigin && this.allowedOrigins.includes(requestOrigin)) {
      return true;
    }

    // Cho phép nếu requestOrigin trùng với host của chính backend server (same-origin request, ví dụ Swagger trên local)
    const hostHeader =
      ((request.headers['x-forwarded-host'] as string) || request.headers['host'])?.toLowerCase();
    if (requestOrigin && hostHeader) {
      try {
        const parsedOrigin = new URL(requestOrigin);
        if (parsedOrigin.host.toLowerCase() === hostHeader) {
          return true;
        }
      } catch {
        // Bỏ qua lỗi parse
      }
    }

    throw new ForbiddenException(
      'Yêu cầu bị từ chối do không vượt qua kiểm tra CSRF (Origin hoặc Referer không hợp lệ).',
    );
  }
}
