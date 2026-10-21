import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { AuthCookieService } from './auth-cookie.service.js';
import type { Request, Response } from 'express';

describe('AuthCookieService', () => {
  let service: AuthCookieService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      COOKIE_ACCESS_TOKEN_NAME: 'access_token',
      COOKIE_REFRESH_TOKEN_NAME: 'refresh_token',
      COOKIE_DOMAIN: '',
      COOKIE_SECURE: 'false',
      COOKIE_SAME_SITE: 'lax',
      COOKIE_PATH: '/',
      JWT_EXPIRES_IN: '8h',
      NODE_ENV: 'development',
    });
    service = new AuthCookieService(configService);
  });

  describe('parseDurationToMs', () => {
    it('should parse hours correctly', () => {
      expect(service.parseDurationToMs('8h')).toBe(8 * 3600 * 1000);
      expect(service.parseDurationToMs('1h')).toBe(3600 * 1000);
    });

    it('should parse days correctly', () => {
      expect(service.parseDurationToMs('30d')).toBe(30 * 86400 * 1000);
      expect(service.parseDurationToMs('1d')).toBe(86400 * 1000);
    });

    it('should parse minutes and seconds correctly', () => {
      expect(service.parseDurationToMs('15m')).toBe(15 * 60 * 1000);
      expect(service.parseDurationToMs('60s')).toBe(60 * 1000);
    });

    it('should return number if already a number or numeric string', () => {
      expect(service.parseDurationToMs(5000)).toBe(5000);
      expect(service.parseDurationToMs('5000')).toBe(5000);
    });

    it('should fallback to defaultMs if invalid', () => {
      expect(service.parseDurationToMs(undefined, 1000)).toBe(1000);
      expect(service.parseDurationToMs('', 2000)).toBe(2000);
    });
  });

  describe('getCookieOptions', () => {
    it('should generate standard security options', () => {
      const options = service.getCookieOptions(1000);
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(false);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(1000);
    });
  });

  describe('setAuthCookies', () => {
    it('should set access_token and refresh_token cookies with HttpOnly', () => {
      const cookieMock = vi.fn();
      const res = { cookie: cookieMock } as unknown as Response;

      service.setAuthCookies(res, {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessExpiresIn: '8h',
        rememberMe: false,
      });

      expect(cookieMock).toHaveBeenCalledTimes(2);

      // Verify access_token cookie
      expect(cookieMock).toHaveBeenCalledWith(
        'access_token',
        'mock-access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 8 * 3600 * 1000,
        }),
      );

      // Verify refresh_token cookie (1 day)
      expect(cookieMock).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should set 30-day maxAge for refresh_token when rememberMe is true', () => {
      const cookieMock = vi.fn();
      const res = { cookie: cookieMock } as unknown as Response;

      service.setAuthCookies(res, {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessExpiresIn: '30d',
        rememberMe: true,
      });

      expect(cookieMock).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should call clearCookie for both tokens with matching options', () => {
      const clearCookieMock = vi.fn();
      const res = { clearCookie: clearCookieMock } as unknown as Response;

      service.clearAuthCookies(res);

      expect(clearCookieMock).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
      expect(clearCookieMock).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
    });
  });

  describe('extractAccessToken', () => {
    it('should prioritize cookie over Bearer header', () => {
      const req = {
        cookies: { access_token: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' },
      } as unknown as Request;

      expect(service.extractAccessToken(req)).toBe('cookie-token');
    });

    it('should fallback to Bearer header if cookie is missing', () => {
      const req = {
        cookies: {},
        headers: { authorization: 'Bearer header-token' },
      } as unknown as Request;

      expect(service.extractAccessToken(req)).toBe('header-token');
    });

    it('should return null if neither is present', () => {
      const req = {
        cookies: {},
        headers: {},
      } as unknown as Request;

      expect(service.extractAccessToken(req)).toBeNull();
    });
  });

  describe('extractRefreshToken', () => {
    it('should prioritize cookie over body fallback', () => {
      const req = {
        cookies: { refresh_token: 'cookie-refresh' },
      } as unknown as Request;

      expect(service.extractRefreshToken(req, 'body-refresh')).toBe('cookie-refresh');
    });

    it('should fallback to provided string if cookie is absent', () => {
      const req = {
        cookies: {},
      } as unknown as Request;

      expect(service.extractRefreshToken(req, 'body-refresh')).toBe('body-refresh');
    });
  });
});
