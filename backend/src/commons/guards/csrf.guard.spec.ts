import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard.js';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      FRONTEND_URL: 'http://localhost:3001,https://app.example.com',
      COOKIE_ACCESS_TOKEN_NAME: 'access_token',
      COOKIE_REFRESH_TOKEN_NAME: 'refresh_token',
    });
    guard = new CsrfGuard(configService);
  });

  function createMockContext(req: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow safe methods (GET, HEAD, OPTIONS) even when auth cookies are present', () => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    for (const method of safeMethods) {
      const context = createMockContext({
        method,
        cookies: { access_token: 'valid-token' },
        headers: { origin: 'http://malicious-site.com' },
      });
      expect(guard.canActivate(context)).toBe(true);
    }
  });

  it('should allow mutating methods when NO auth cookies are present (e.g. Bearer token / public)', () => {
    const context = createMockContext({
      method: 'POST',
      cookies: {},
      headers: { authorization: 'Bearer token123' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow mutating request with auth cookie when Origin matches FRONTEND_URL', () => {
    const context = createMockContext({
      method: 'POST',
      cookies: { access_token: 'valid-token' },
      headers: { origin: 'http://localhost:3001' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow mutating request with auth cookie when Referer matches FRONTEND_URL', () => {
    const context = createMockContext({
      method: 'PUT',
      cookies: { access_token: 'valid-token' },
      headers: { referer: 'https://app.example.com/settings/profile' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow mutating request with auth cookie when Origin matches local host (same-origin)', () => {
    const context = createMockContext({
      method: 'DELETE',
      cookies: { access_token: 'valid-token' },
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject mutating request with auth cookie when Origin does not match allowed origins', () => {
    const context = createMockContext({
      method: 'POST',
      cookies: { access_token: 'valid-token' },
      headers: { origin: 'http://evil-attacker.com' },
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject mutating request with auth cookie when Referer does not match allowed origins', () => {
    const context = createMockContext({
      method: 'PATCH',
      cookies: { refresh_token: 'valid-refresh' },
      headers: { referer: 'http://evil-attacker.com/malicious-page' },
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject mutating request with auth cookie when both Origin and Referer are missing', () => {
    const context = createMockContext({
      method: 'POST',
      cookies: { access_token: 'valid-token' },
      headers: {},
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
