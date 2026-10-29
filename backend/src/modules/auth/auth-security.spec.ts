import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { CsrfGuard } from '../../commons/guards/csrf.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import type { UserService } from '../user/user.service.js';
import { RedisService } from '../../commons/redis/redis.service.js';
import { ErrorCode } from '../../commons/constants/error-codes.js';

describe('Auth & Cookie Security Review Test Suite', () => {
  let configService: ConfigService;
  let jwtService: JwtService;
  let userService: Partial<UserService>;
  let redisService: Partial<RedisService>;
  let authService: AuthService;
  let csrfGuard: CsrfGuard;

  const JWT_SECRET = 'super-secret-key-that-is-at-least-32-chars-long-123456';

  beforeEach(() => {
    configService = new ConfigService({
      JWT_SECRET,
      JWT_EXPIRES_IN: '8h',
      FRONTEND_URL: 'http://localhost:3001,https://app.example.com',
      COOKIE_ACCESS_TOKEN_NAME: 'access_token',
      COOKIE_REFRESH_TOKEN_NAME: 'refresh_token',
      COOKIE_DOMAIN: '',
      COOKIE_SECURE: 'false',
      COOKIE_SAME_SITE: 'lax',
      COOKIE_PATH: '/',
      NODE_ENV: 'development',
    });

    jwtService = new JwtService({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    });

    userService = {
      findForAuthenticationByUsername: vi.fn(),
      findForAuthenticationById: vi.fn(),
      update: vi.fn(),
      resolveAvatarUrl: vi.fn().mockResolvedValue(null),
    };

    redisService = {
      saveRefreshToken: vi.fn().mockResolvedValue(undefined),
      getUserIdByRefreshToken: vi.fn().mockResolvedValue(null),
      deleteRefreshToken: vi.fn().mockResolvedValue(undefined),
      blacklistAccessToken: vi.fn().mockResolvedValue(undefined),
      isAccessTokenBlacklisted: vi.fn().mockResolvedValue(false),
      getRefreshTokenTtl: vi.fn().mockResolvedValue(24 * 60 * 60),
      saveRotatedTokenResult: vi.fn().mockResolvedValue(undefined),
      getRotatedTokenResult: vi.fn().mockResolvedValue(null),
      acquireRotationLock: vi.fn().mockResolvedValue(true),
      releaseRotationLock: vi.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(
      userService as UserService,
      jwtService,
      configService,
      redisService as RedisService,
    );

    csrfGuard = new CsrfGuard(configService);
  });

  // ─── 1. ACCESS TOKEN LIFETIME & REMEMBER ME ───────────────────────────────
  describe('1. Access Token Lifetime Isolation', () => {
    it('access token MUST remain short-lived (8h) and NOT extended to 30d even when rememberMe=true', async () => {
      const signSpy = vi.spyOn(jwtService, 'sign');
      vi.mocked(userService.findForAuthenticationByUsername!).mockResolvedValue(
        {
          id: 1,
          username: 'testuser',
          passwordHash: await import('argon2').then((a) =>
            a.hash('password123'),
          ),
          isActive: true,
          roleId: 1,
          enterpriseId: null,
          role: { roleCode: 'ADMIN', isActive: true },
          enterprise: null,
        } as any,
      );

      const result = await authService.login({
        username: 'testuser',
        password: 'password123',
        rememberMe: true,
      });

      // Verify sign was called with expiresIn='8h' (JWT_EXPIRES_IN), NOT '30d'
      expect(signSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '8h' }),
      );

      // Verify the returned expiresIn is 8h
      expect(result.expiresIn).toBe('8h');

      // Verify refresh token TTL is 30 days (2592000s)
      expect(result.refreshExpiresInSeconds).toBe(30 * 24 * 60 * 60);
      expect(redisService.saveRefreshToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
        30 * 24 * 60 * 60,
      );
    });

    it('rejects login when the linked enterprise is inactive', async () => {
      vi.mocked(userService.findForAuthenticationByUsername!).mockResolvedValue(
        {
          id: 2,
          username: 'enterprise-user',
          passwordHash: await import('argon2').then((a) =>
            a.hash('password123'),
          ),
          isActive: true,
          roleId: 2,
          enterpriseId: 10,
          role: { roleCode: 'ENTERPRISE_USER', isActive: true },
          enterprise: { id: 10, isActive: false },
        } as any,
      );

      await expect(
        authService.login({
          username: 'enterprise-user',
          password: 'password123',
          rememberMe: false,
        }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.ACCOUNT_INACTIVE },
      });
      expect(redisService.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects login with ACCOUNT_INACTIVE when the user is inactive and password is correct', async () => {
      vi.mocked(userService.findForAuthenticationByUsername!).mockResolvedValue(
        {
          id: 3,
          username: 'inactive-user',
          passwordHash: await import('argon2').then((a) =>
            a.hash('password123'),
          ),
          isActive: false,
          roleId: 1,
          enterpriseId: null,
          role: { roleCode: 'ADMIN', isActive: true },
          enterprise: null,
        } as any,
      );

      await expect(
        authService.login({
          username: 'inactive-user',
          password: 'password123',
          rememberMe: false,
        }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.ACCOUNT_INACTIVE },
      });
      expect(redisService.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('returns WRONG_PASSWORD for an inactive user with a wrong password', async () => {
      vi.mocked(userService.findForAuthenticationByUsername!).mockResolvedValue(
        {
          id: 3,
          username: 'inactive-user',
          passwordHash: await import('argon2').then((a) =>
            a.hash('password123'),
          ),
          isActive: false,
          roleId: 1,
          enterpriseId: null,
          role: { roleCode: 'ADMIN', isActive: true },
          enterprise: null,
        } as any,
      );

      await expect(
        authService.login({
          username: 'inactive-user',
          password: 'wrong-password',
          rememberMe: false,
        }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.WRONG_PASSWORD },
      });
    });
  });

  // ─── 2. LOGOUT SECURITY & TOKEN VERIFICATION ──────────────────────────────
  describe('2. Logout Security & Untrusted Claims Prevention', () => {
    it('should NOT trust unverified/forged access token to delete victim session (anti-DoS)', async () => {
      // Attacker crafts a token with a DIFFERENT secret claiming to be victim (sub: 999)
      const fakeJwtService = new JwtService({
        secret: 'attacker-evil-secret-key-123456789',
      });
      const forgedToken = fakeJwtService.sign({
        sub: 999,
        jti: 'attacker-jti',
      });

      await authService.logout(null, forgedToken, null);

      // Verify deleteRefreshToken was NEVER called for victim 999
      expect(redisService.deleteRefreshToken).not.toHaveBeenCalledWith(999);
      // Verify blacklist was NOT called for attacker token
      expect(redisService.blacklistAccessToken).not.toHaveBeenCalled();
    });

    it('should allow logout and revoke session when access token is authentically signed but expired', async () => {
      // Sign a token with legitimate secret, but expired 10 seconds ago
      const pastTime = Math.floor(Date.now() / 1000) - 10;
      const expiredToken = (await import('jsonwebtoken')).default.sign(
        {
          sub: 42,
          username: 'user42',
          roleId: 1,
          jti: 'real-jti-123',
          exp: pastTime,
        },
        JWT_SECRET,
      );

      await authService.logout(null, expiredToken, null);

      // Verify refresh token of user 42 is revoked in Redis
      expect(redisService.deleteRefreshToken).toHaveBeenCalledWith(42);
      // Since it is already expired (ttl <= 0), no need to blacklist
      expect(redisService.blacklistAccessToken).not.toHaveBeenCalled();
    });

    it('should allow logout and revoke session using valid refresh token when access token is missing', async () => {
      const validRefreshToken = crypto.randomBytes(40).toString('hex');
      const hash = crypto
        .createHash('sha256')
        .update(validRefreshToken)
        .digest('hex');

      vi.mocked(redisService.getUserIdByRefreshToken!).mockResolvedValue(100);

      await authService.logout(null, null, validRefreshToken);

      expect(redisService.getUserIdByRefreshToken).toHaveBeenCalledWith(hash);
      expect(redisService.deleteRefreshToken).toHaveBeenCalledWith(100);
    });

    it('should gracefully succeed when logging out with missing tokens / already logged out', async () => {
      const result = await authService.logout(null, null, null);
      expect(result).toEqual({
        message: 'Đăng xuất thành công.',
        action: 'CLEAR_TOKEN',
      });
      expect(redisService.deleteRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ─── 3. CSRF GUARD SECURITY ───────────────────────────────────────────────
  describe('3. CSRF Protection Comprehensive Checks', () => {
    function createMockContext(req: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => ({}),
        }),
      } as unknown as ExecutionContext;
    }

    it('should REJECT mutating request with cookie when Origin is untrusted', () => {
      const ctx = createMockContext({
        method: 'POST',
        cookies: { access_token: 'valid-token' },
        headers: { origin: 'http://malicious-attacker.com' },
      });

      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT mutating request with cookie when both Origin and Referer are missing', () => {
      const ctx = createMockContext({
        method: 'POST',
        cookies: { access_token: 'valid-token' },
        headers: {},
      });

      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should NOT bypass CSRF just because request includes Authorization Bearer header if cookie is present', () => {
      const ctx = createMockContext({
        method: 'POST',
        cookies: { access_token: 'valid-token' },
        headers: {
          authorization: 'Bearer dummy-token',
          origin: 'http://evil-cross-origin.com',
        },
      });

      // CSRF MUST be checked and rejected because ambient cookie is present
      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should ALLOW mutating request that solely uses Bearer header and has NO cookies', () => {
      const ctx = createMockContext({
        method: 'POST',
        cookies: {},
        headers: {
          authorization: 'Bearer valid-api-token',
          // No origin, like curl / Postman
        },
      });

      expect(csrfGuard.canActivate(ctx)).toBe(true);
    });

    it('should protect POST /auth/refresh and POST /auth/logout when refresh_token cookie is present', () => {
      // Attempting CSRF against /auth/refresh with attacker origin
      const refreshCtx = createMockContext({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refresh_token: 'valid-refresh-cookie' },
        headers: { origin: 'http://evil-site.com' },
      });

      expect(() => csrfGuard.canActivate(refreshCtx)).toThrow(
        ForbiddenException,
      );

      // Attempting CSRF against /auth/logout with attacker origin
      const logoutCtx = createMockContext({
        method: 'POST',
        url: '/api/v1/auth/logout',
        cookies: { refresh_token: 'valid-refresh-cookie' },
        headers: { origin: 'http://evil-site.com' },
      });

      expect(() => csrfGuard.canActivate(logoutCtx)).toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── 4. COOKIE CONFIGURATION & RFC COMPLIANCE ─────────────────────────────
  describe('4. Cookie Configuration & RFC 6265bis Compliance', () => {
    it('must automatically enforce secure=true if SameSite=none', () => {
      const noneConfig = new ConfigService({
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false', // explicitly set false
        NODE_ENV: 'development',
      });

      const cookieService = new AuthCookieService(noneConfig);
      const options = cookieService.getCookieOptions();

      // Browsers reject SameSite=None without Secure
      expect(options.sameSite).toBe('none');
      expect(options.secure).toBe(true);
    });

    it('should parse boolean COOKIE_SECURE flexibly (1, True, true, 0, false)', () => {
      const configTrue1 = new ConfigService({ COOKIE_SECURE: '1' });
      expect(new AuthCookieService(configTrue1).getCookieOptions().secure).toBe(
        true,
      );

      const configTrue2 = new ConfigService({ COOKIE_SECURE: 'True' });
      expect(new AuthCookieService(configTrue2).getCookieOptions().secure).toBe(
        true,
      );

      const configFalse1 = new ConfigService({ COOKIE_SECURE: '0' });
      expect(
        new AuthCookieService(configFalse1).getCookieOptions().secure,
      ).toBe(false);

      const configFalse2 = new ConfigService({ COOKIE_SECURE: 'false' });
      expect(
        new AuthCookieService(configFalse2).getCookieOptions().secure,
      ).toBe(false);
    });
  });

  // ─── 5. JWT STRATEGY COOKIE VS BEARER PRIORITY ───────────────────────────
  describe('5. JwtStrategy Token Extraction Alignment', () => {
    it('prioritizes cookie over Bearer token and verifies cryptographically', async () => {
      const strategy = new JwtStrategy(
        configService,
        userService as UserService,
        redisService as RedisService,
      );

      vi.mocked(userService.findForAuthenticationById!).mockResolvedValue({
        id: 7,
        username: 'user7',
        roleId: 2,
        isActive: true,
        enterpriseId: 10,
        role: { roleCode: 'ENTERPRISE_USER', isActive: true },
        enterprise: { id: 10, isActive: true },
      } as any);

      const payload = { sub: 7, username: 'user7', roleId: 2, jti: 'jti-7' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({
        id: 7,
        username: 'user7',
        roleId: 2,
        roleCode: 'ENTERPRISE_USER',
      });
    });
  });

  // ─── 6. REFRESH-TOKEN ROTATION CONCURRENCY & REPLAY ATTACK MITIGATION ─────
  describe('6. Refresh-Token Rotation, Multi-Tab Concurrency & Replay Protection', () => {
    it('revokes the refresh session when the linked enterprise is inactive', async () => {
      const refreshToken = 'inactive-enterprise-refresh-token';
      vi.mocked(redisService.getUserIdByRefreshToken!).mockResolvedValue(30);
      vi.mocked(redisService.acquireRotationLock!).mockResolvedValue(true);
      vi.mocked(userService.findForAuthenticationById!).mockResolvedValue({
        id: 30,
        username: 'inactive-enterprise-user',
        roleId: 2,
        isActive: true,
        enterpriseId: 10,
        role: { roleCode: 'ENTERPRISE_USER', isActive: true },
        enterprise: { id: 10, isActive: false },
      } as any);

      await expect(authService.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redisService.deleteRefreshToken).toHaveBeenCalledWith(30);
    });

    it('should allow concurrent tab to proceed with accessToken while NOT re-issuing raw refreshToken in grace period', async () => {
      const oldRefreshToken = 'initial-refresh-token-40-bytes-hex-string';
      const oldTokenHash = crypto
        .createHash('sha256')
        .update(oldRefreshToken)
        .digest('hex');

      vi.mocked(redisService.getUserIdByRefreshToken!).mockResolvedValue(10);
      vi.mocked(redisService.acquireRotationLock!).mockResolvedValue(true);
      vi.mocked(userService.findForAuthenticationById!).mockResolvedValue({
        id: 10,
        username: 'user10',
        roleId: 1,
        isActive: true,
        enterpriseId: null,
        role: { roleCode: 'ADMIN', isActive: true },
        enterprise: null,
      } as any);

      // Request 1: first tab rotates token
      const res1 = await authService.refreshTokens(oldRefreshToken);

      expect(res1.accessToken).toBeDefined();
      expect(res1.refreshToken).toBeDefined();
      // Verify saveRotatedTokenResult was called to cache accessToken for other concurrent tabs WITHOUT refreshToken
      expect(redisService.saveRotatedTokenResult).toHaveBeenCalledWith(
        oldTokenHash,
        JSON.stringify({
          accessToken: res1.accessToken,
          expiresIn: res1.expiresIn,
        }),
        15,
      );

      // Request 2: concurrent second tab calls with the exact same old token
      // Mock that getRotatedTokenResult returns the cached JSON saved by Request 1
      vi.mocked(redisService.getRotatedTokenResult!).mockResolvedValue(
        JSON.stringify({
          accessToken: res1.accessToken,
          expiresIn: res1.expiresIn,
        }),
      );

      const res2 = await authService.refreshTokens(oldRefreshToken);

      // Tab 2 receives the valid accessToken to proceed without error
      expect(res2.accessToken).toBe(res1.accessToken);
      // But Tab 2 does NOT receive raw refreshToken (browser already has it via Set-Cookie from Request 1)
      expect(res2.refreshToken).toBeUndefined();
      // Verify no second rotation took place in Redis
      expect(redisService.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should prevent an attacker from obtaining new refreshToken during grace period (anti-theft)', async () => {
      const stolenOldToken = 'stolen-refresh-token-40-bytes';

      // Attacker replays stolenOldToken within 15s grace period
      vi.mocked(redisService.getRotatedTokenResult!).mockResolvedValue(
        JSON.stringify({
          accessToken: 'victim-new-access-token',
          expiresIn: '8h',
        }),
      );

      const attackerResult = await authService.refreshTokens(stolenOldToken);

      // Attacker receives accessToken (temporary), but NEVER receives the new refreshToken!
      expect(attackerResult.accessToken).toBe('victim-new-access-token');
      expect(attackerResult.refreshToken).toBeUndefined();
      // Verify no new token was generated for attacker
      expect(redisService.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('should acquire lock with a unique ownerId and release it with that same ownerId', async () => {
      const testToken = 'test-token-to-rotate-12345';
      vi.mocked(redisService.getUserIdByRefreshToken!).mockResolvedValue(20);
      vi.mocked(redisService.acquireRotationLock!).mockResolvedValue(true);
      vi.mocked(userService.findForAuthenticationById!).mockResolvedValue({
        id: 20,
        username: 'user20',
        roleId: 1,
        isActive: true,
        enterpriseId: null,
        role: { roleCode: 'ADMIN', isActive: true },
        enterprise: null,
      } as any);

      await authService.refreshTokens(testToken);

      // Verify acquireRotationLock was called with ownerId (UUID string)
      expect(redisService.acquireRotationLock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
        5,
      );

      // Get the ownerId passed to acquireRotationLock
      const acquiredOwnerId = vi.mocked(redisService.acquireRotationLock).mock
        .calls[0][1];

      // Verify releaseRotationLock was called with the exact same ownerId
      expect(redisService.releaseRotationLock).toHaveBeenCalledWith(
        expect.any(String),
        acquiredOwnerId,
      );
    });

    it('should reject replay of an old token after grace period expires (anti-replay)', async () => {
      const expiredRefreshToken = 'old-replayed-token';

      // Grace period expired (returns null) and active token list does not contain it (returns null)
      vi.mocked(redisService.getRotatedTokenResult!).mockResolvedValue(null);
      vi.mocked(redisService.getUserIdByRefreshToken!).mockResolvedValue(null);

      await expect(
        authService.refreshTokens(expiredRefreshToken),
      ).rejects.toThrow(UnauthorizedException);

      // Verify no tokens were issued
      expect(redisService.saveRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ─── 7. PRE-EXECUTION CSRF REJECTION PROOF ────────────────────────────────
  describe('7. CSRF Rejection Precedes Business Execution', () => {
    function createMockContext(req: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => ({}),
        }),
      } as unknown as ExecutionContext;
    }

    it('CsrfGuard rejection must prevent logout business logic from executing on untrusted origin', async () => {
      const logoutSpy = vi.spyOn(authService, 'logout');

      const ctx = createMockContext({
        method: 'POST',
        url: '/api/v1/auth/logout',
        cookies: { access_token: 'valid-cookie' },
        headers: { origin: 'http://untrusted-attacker.com' },
      });

      // CsrfGuard blocks the request
      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);

      // Business logic must NEVER be called
      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it('CsrfGuard rejection must prevent refresh business logic from executing on untrusted origin', async () => {
      const refreshSpy = vi.spyOn(authService, 'refreshTokens');

      const ctx = createMockContext({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refresh_token: 'valid-refresh-cookie' },
        headers: { origin: 'http://untrusted-attacker.com' },
      });

      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('CsrfGuard rejection must block requests missing both Origin and Referer before business logic', async () => {
      const refreshSpy = vi.spyOn(authService, 'refreshTokens');

      const ctx = createMockContext({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refresh_token: 'valid-refresh-cookie' },
        headers: {}, // Both Origin and Referer missing
      });

      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });

  // ─── 8. REDIS DISTRIBUTED LOCK & LUA SCRIPT ATOMICITY ─────────────────────
  describe('8. Redis Distributed Lock & Lua Script Atomicity', () => {
    let testRedisService: RedisService;
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        set: vi.fn(),
        eval: vi.fn(),
      };
      testRedisService = new RedisService(configService);
      (testRedisService as any).client = mockClient;
    });

    it('should acquire lock with a unique owner identifier using SET NX EX', async () => {
      mockClient.set.mockResolvedValue('OK');

      const acquired = await testRedisService.acquireRotationLock(
        'tokenHash123',
        'owner-uuid-1',
        5,
      );

      expect(acquired).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith(
        'rt_lock:tokenHash123',
        'owner-uuid-1',
        'EX',
        5,
        'NX',
      );
    });

    it('should fail to acquire lock if another process already holds it (SET NX returns null)', async () => {
      mockClient.set.mockResolvedValue(null);

      const acquired = await testRedisService.acquireRotationLock(
        'tokenHash123',
        'owner-uuid-2',
        5,
      );

      expect(acquired).toBe(false);
    });

    it('should NOT delete lock held by another process when old lock holder attempts to release after expiry', async () => {
      // Scenario:
      // Request 1 took lock with 'owner-1'.
      // Request 1 took longer than TTL -> Lock expired in Redis.
      // Request 2 arrived and acquired lock with 'owner-2'.
      // Request 1 finally finishes and calls releaseRotationLock with its expired 'owner-1'.
      // Lua script in Redis checks: redis.call("get", key) is 'owner-2', does NOT match ARGV[1] ('owner-1') -> returns 0.
      mockClient.eval.mockImplementation(
        async (
          _script: string,
          _numKeys: number,
          _key: string,
          owner: string,
        ) => {
          const currentLockInRedis = 'owner-2';
          if (owner === currentLockInRedis) {
            return 1;
          }
          return 0; // Does NOT delete owner-2's lock!
        },
      );

      // Request 1 attempts release with its expired 'owner-1'
      const released = await testRedisService.releaseRotationLock(
        'tokenHash123',
        'owner-1',
      );

      // The release attempt MUST fail (return false)
      expect(released).toBe(false);

      // Verify the Lua script was executed with the expected key and owner
      expect(mockClient.eval).toHaveBeenCalledWith(
        expect.stringContaining('if redis.call("get", KEYS[1]) == ARGV[1]'),
        1,
        'rt_lock:tokenHash123',
        'owner-1',
      );
    });

    it('should successfully delete lock when owner matches', async () => {
      mockClient.eval.mockImplementation(
        async (
          _script: string,
          _numKeys: number,
          _key: string,
          owner: string,
        ) => {
          const currentLockInRedis = 'owner-current';
          if (owner === currentLockInRedis) {
            return 1;
          }
          return 0;
        },
      );

      const released = await testRedisService.releaseRotationLock(
        'tokenHash123',
        'owner-current',
      );
      expect(released).toBe(true);
    });
  });
});
