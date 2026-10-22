import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';

describe('AuthService – OTP error codes and limits', () => {
  let authService: AuthService;
  let userService: Record<string, any>;
  let redisService: Record<string, any>;

  const activeUser = (overrides: Record<string, any> = {}) => ({
    id: 7,
    username: 'user',
    fullName: 'User',
    email: 'user@example.com',
    isActive: true,
    resetPasswordToken: '123456',
    resetPasswordExpires: new Date(Date.now() + 60_000),
    ...overrides,
  });

  beforeEach(() => {
    userService = {
      findByEmail: vi.fn(),
      findOneOrFail: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    redisService = {
      acquireOtpCooldown: vi.fn().mockResolvedValue(true),
      incrementOtpAttempts: vi.fn().mockResolvedValue(1),
      clearOtpAttempts: vi.fn().mockResolvedValue(undefined),
      deleteRefreshToken: vi.fn().mockResolvedValue(undefined),
    };
    authService = new AuthService(
      userService as any,
      new JwtService({ secret: 'test-secret-test-secret-test-secret' }),
      new ConfigService({}),
      redisService as any,
    );
  });

  it('forgotPassword returns EMAIL_NOT_FOUND for an unknown email', async () => {
    userService.findByEmail.mockResolvedValue(null);
    await expect(
      authService.forgotPassword({ email: 'nobody@example.com' }),
    ).rejects.toMatchObject({ response: { code: 'EMAIL_NOT_FOUND' } });
  });

  it('forgotPassword returns OTP_RESEND_TOO_SOON inside the cooldown', async () => {
    userService.findByEmail.mockResolvedValue(activeUser());
    redisService.acquireOtpCooldown.mockResolvedValue(false);
    await expect(
      authService.forgotPassword({ email: 'user@example.com' }),
    ).rejects.toMatchObject({ response: { code: 'OTP_RESEND_TOO_SOON' } });
    expect(userService.update).not.toHaveBeenCalled();
  });

  it('resetPassword accepts a request without confirmNewPassword', async () => {
    userService.findByEmail.mockResolvedValue(activeUser());
    const result = await authService.resetPasswordWithOtp({
      email: 'user@example.com',
      otp: '123456',
      newPassword: 'NewPass@2024',
    });
    expect(result.action).toBe('REDIRECT_TO_LOGIN');
  });

  it('resetPassword returns PASSWORD_MISMATCH when confirmation differs', async () => {
    await expect(
      authService.resetPasswordWithOtp({
        email: 'user@example.com',
        otp: '123456',
        newPassword: 'NewPass@2024',
        confirmNewPassword: 'Other@2024',
      }),
    ).rejects.toMatchObject({ response: { code: 'PASSWORD_MISMATCH' } });
  });

  it('resetPassword returns OTP_NOT_REQUESTED when no OTP was sent', async () => {
    userService.findByEmail.mockResolvedValue(
      activeUser({ resetPasswordToken: null, resetPasswordExpires: null }),
    );
    await expect(
      authService.resetPasswordWithOtp({ email: 'user@example.com', otp: '123456', newPassword: 'NewPass@2024' }),
    ).rejects.toMatchObject({ response: { code: 'OTP_NOT_REQUESTED' } });
  });

  it('resetPassword returns OTP_EXPIRED and clears the OTP', async () => {
    userService.findByEmail.mockResolvedValue(
      activeUser({ resetPasswordExpires: new Date(Date.now() - 1000) }),
    );
    await expect(
      authService.resetPasswordWithOtp({ email: 'user@example.com', otp: '123456', newPassword: 'NewPass@2024' }),
    ).rejects.toMatchObject({ response: { code: 'OTP_EXPIRED' } });
    expect(userService.update).toHaveBeenCalledWith(7, {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  });

  it('resetPassword returns OTP_INVALID on a wrong code', async () => {
    userService.findByEmail.mockResolvedValue(activeUser());
    await expect(
      authService.resetPasswordWithOtp({ email: 'user@example.com', otp: '000000', newPassword: 'NewPass@2024' }),
    ).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
    expect(redisService.incrementOtpAttempts).toHaveBeenCalledWith('fp:7', 300);
  });

  it('resetPassword invalidates the OTP after 5 wrong attempts', async () => {
    userService.findByEmail.mockResolvedValue(activeUser());
    redisService.incrementOtpAttempts.mockResolvedValue(5);
    await expect(
      authService.resetPasswordWithOtp({ email: 'user@example.com', otp: '000000', newPassword: 'NewPass@2024' }),
    ).rejects.toMatchObject({ response: { code: 'OTP_TOO_MANY_ATTEMPTS' } });
    expect(userService.update).toHaveBeenCalledWith(7, {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  });
});
