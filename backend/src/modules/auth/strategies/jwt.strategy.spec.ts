import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy.js';
import type { UserService } from '../../user/user.service.js';
import type { RedisService } from '../../../commons/redis/redis.service.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let userService: Partial<UserService>;
  let redisService: Partial<RedisService>;

  beforeEach(() => {
    configService = new ConfigService({
      JWT_SECRET: 'test-secret-key-min-32-chars-long-12345',
      COOKIE_ACCESS_TOKEN_NAME: 'access_token',
    });

    userService = {
      findOne: vi.fn(),
    };

    redisService = {
      isAccessTokenBlacklisted: vi.fn(),
    };

    strategy = new JwtStrategy(
      configService,
      userService as UserService,
      redisService as RedisService,
    );
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: 1,
      username: 'admin',
      roleId: 1,
      jti: 'mock-uuid',
      iat: Math.floor(Date.now() / 1000),
    };

    const mockUser = {
      id: 1,
      username: 'admin',
      roleId: 1,
      isActive: true,
      passwordChangedAt: null,
    };

    it('should validate and return user payload when token is active and valid', async () => {
      vi.mocked(redisService.isAccessTokenBlacklisted!).mockResolvedValue(false);
      vi.mocked(userService.findOne!).mockResolvedValue(mockUser as any);

      const result = await strategy.validate(validPayload);
      expect(result).toEqual({ id: 1, username: 'admin', roleId: 1 });
    });

    it('should throw UnauthorizedException when token jti is blacklisted in Redis', async () => {
      vi.mocked(redisService.isAccessTokenBlacklisted!).mockResolvedValue(true);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user does not exist or is inactive', async () => {
      vi.mocked(redisService.isAccessTokenBlacklisted!).mockResolvedValue(false);
      vi.mocked(userService.findOne!).mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );

      vi.mocked(userService.findOne!).mockResolvedValue({ ...mockUser, isActive: false } as any);
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password was changed after token issuance', async () => {
      vi.mocked(redisService.isAccessTokenBlacklisted!).mockResolvedValue(false);
      const passwordChangedAt = new Date(Date.now() + 100000); // Changed in future relative to iat
      vi.mocked(userService.findOne!).mockResolvedValue({
        ...mockUser,
        passwordChangedAt,
      } as any);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
