import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleCode } from '../constants/role-codes.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let guard: RolesGuard;

  const createContext = (roleCode?: string) =>
    ({
      getHandler: () => vi.fn(),
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({ user: roleCode ? { roleCode } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows an authenticated endpoint without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext('ENTERPRISE_USER'))).toBe(true);
  });

  it('allows a user with an authorized role code', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.ADMIN]);

    expect(guard.canActivate(createContext(RoleCode.ADMIN))).toBe(true);
  });

  it('rejects a user without an authorized role code', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.ADMIN]);

    expect(() =>
      guard.canActivate(createContext(RoleCode.ENTERPRISE_USER)),
    ).toThrow(ForbiddenException);
  });
});
