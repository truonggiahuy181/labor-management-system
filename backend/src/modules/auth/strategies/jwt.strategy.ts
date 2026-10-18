import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service.js';

export interface JwtPayload {
  sub: number;
  username: string;
  roleId: number;
  iat?: number; // issued at – được JWT tự gắn
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret-change-me'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userService.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }

    // ─── Force Logout sau khi đổi mật khẩu ─────────────────────────────────
    // Nếu mật khẩu được đổi SAU khi token được cấp → token cũ không hợp lệ
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedDate =
        user.passwordChangedAt instanceof Date
          ? user.passwordChangedAt
          : new Date(user.passwordChangedAt);
      const passwordChangedAtSec = Math.floor(
        passwordChangedDate.getTime() / 1000,
      );

      // Token chỉ bị coi là hết hạn nếu được cấp TRƯỚC thời điểm đổi mật khẩu (tính theo giây)
      if (payload.iat < passwordChangedAtSec) {
        throw new UnauthorizedException(
          'Phiên đăng nhập đã hết hạn do mật khẩu vừa được thay đổi. Vui lòng đăng nhập lại.',
        );
      }
    }

    return { id: user.id, username: user.username, roleId: user.roleId };
  }
}
