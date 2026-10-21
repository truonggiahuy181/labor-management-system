import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { AuthCookieService } from './auth-cookie.service.js';
import type { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;
  let authCookieService: Partial<AuthCookieService>;

  beforeEach(() => {
    authService = {
      login: vi.fn(),
      refreshTokens: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
    };

    authCookieService = {
      setAuthCookies: vi.fn(),
      clearAuthCookies: vi.fn(),
      extractAccessToken: vi.fn(),
      extractRefreshToken: vi.fn(),
    };

    controller = new AuthController(
      authService as AuthService,
      authCookieService as AuthCookieService,
    );
  });

  describe('login', () => {
    it('should set cookies on response and return user without exposing tokens in body', async () => {
      const loginDto = { username: 'admin', password: 'password123', rememberMe: true };
      const res = {} as Response;

      const mockServiceResult = {
        accessToken: 'access-jwt-token',
        refreshToken: 'refresh-token-hex',
        expiresIn: '30d',
        user: {
          id: 1,
          username: 'admin',
          fullName: 'Quản trị viên',
          email: 'admin@example.com',
          roleId: 1,
          avatarUrl: null,
          isActive: true,
        },
      };

      vi.mocked(authService.login!).mockResolvedValue(mockServiceResult as any);

      const result = await controller.login(loginDto, res);

      // Verify cookies are set
      expect(authCookieService.setAuthCookies).toHaveBeenCalledWith(res, {
        accessToken: 'access-jwt-token',
        refreshToken: 'refresh-token-hex',
        accessExpiresIn: '30d',
        rememberMe: true,
      });

      // Verify tokens are NOT in returned object
      expect((result as any).accessToken).toBeUndefined();
      expect((result as any).refreshToken).toBeUndefined();
      expect(result.user).toEqual(mockServiceResult.user);
    });
  });

  describe('refresh', () => {
    it('should read refresh token from cookie and set new cookies on response', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const dto = {};

      vi.mocked(authCookieService.extractRefreshToken!).mockReturnValue('valid-refresh-token');
      vi.mocked(authService.refreshTokens!).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '8h',
      });

      const result = await controller.refresh(req, res, dto);

      expect(authCookieService.extractRefreshToken).toHaveBeenCalledWith(req, undefined);
      expect(authService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(authCookieService.setAuthCookies).toHaveBeenCalledWith(res, {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessExpiresIn: '8h',
      });

      expect(result).toEqual({ message: 'Cấp token mới thành công.' });
      expect((result as any).accessToken).toBeUndefined();
      expect((result as any).refreshToken).toBeUndefined();
    });

    it('should throw UnauthorizedException if refresh token is missing in cookie and body', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const dto = {};

      vi.mocked(authCookieService.extractRefreshToken!).mockReturnValue(null);

      await expect(controller.refresh(req, res, dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.refreshTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should extract tokens, revoke in Redis, and clear cookies on response', async () => {
      const req = {} as Request;
      const res = {} as Response;

      vi.mocked(authCookieService.extractAccessToken!).mockReturnValue('access-token');
      vi.mocked(authCookieService.extractRefreshToken!).mockReturnValue('refresh-token');
      vi.mocked(authService.logout!).mockResolvedValue({
        message: 'Đăng xuất thành công.',
        action: 'CLEAR_TOKEN',
      });

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(null, 'access-token', 'refresh-token');
      expect(authCookieService.clearAuthCookies).toHaveBeenCalledWith(res);
      expect(result).toEqual({
        message: 'Đăng xuất thành công.',
        action: 'CLEAR_TOKEN',
      });
    });
  });

  describe('changePassword', () => {
    it('should change password and clear auth cookies on response', async () => {
      const user = { id: 1 };
      const dto = {
        currentPassword: 'oldPass',
        newPassword: 'newPass123',
        confirmNewPassword: 'newPass123',
      };
      const res = {} as Response;

      vi.mocked(authService.changePassword!).mockResolvedValue({
        message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        action: 'FORCE_LOGOUT',
      });

      const result = await controller.changePassword(user, dto, res);

      expect(authService.changePassword).toHaveBeenCalledWith(1, dto);
      expect(authCookieService.clearAuthCookies).toHaveBeenCalledWith(res);
      expect(result).toEqual({
        message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        action: 'FORCE_LOGOUT',
      });
    });
  });
});
