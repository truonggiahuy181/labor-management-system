import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service.js';
import { RedisService } from '../../../commons/redis/redis.service.js';

export interface JwtPayload {
  sub: number;
  username: string;
  roleId: number;
  jti: string;       // JWT ID – dùng để blacklist khi logout
  iat?: number;      // issued at – được JWT tự gắn
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET chưa được cấu hình trong biến môi trường.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    // ─── Kiểm tra blacklist (token bị logout) ────────────────────────────────
    if (payload.jti) {
      const isBlacklisted = await this.redisService.isAccessTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token đã bị vô hiệu hóa. Vui lòng đăng nhập lại.');
      }
    }

    const user = await this.userService.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }

    // ─── Force Logout sau khi đổi mật khẩu ─────────────────────────────────
    // Nếu mật khẩu được đổi SAU HOẶC CÙNG THỜI ĐIỂM token được cấp → token cũ không hợp lệ
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedDate =
        user.passwordChangedAt instanceof Date
          ? user.passwordChangedAt
          : new Date(user.passwordChangedAt);
      const passwordChangedAtSec = Math.floor(
        passwordChangedDate.getTime() / 1000,
      );

      // Dùng <= để bắt cả token được cấp trong cùng giây đổi mật khẩu
      if (payload.iat <= passwordChangedAtSec) {
        throw new UnauthorizedException(
          'Phiên đăng nhập đã hết hạn do mật khẩu vừa được thay đổi. Vui lòng đăng nhập lại.',
        );
      }
    }

    return { id: user.id, username: user.username, roleId: user.roleId };
  }
}
