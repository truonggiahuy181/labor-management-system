import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BusinessRegistrationService } from '../business-registration.service.js';
import type { RegisterBusinessDto } from '../dto/register-business.dto.js';

const PDF_BUFFER = Buffer.from('%PDF-1.7 test');

function baseDto(overrides: Partial<RegisterBusinessDto> = {}): RegisterBusinessDto {
  return {
    companyName: 'Công ty ABC',
    taxCode: '0101234567',
    businessType: 'TNHH1',
    mainIndustry: '6201',
    licenseDate: '2020-01-15',
    province: 'HCM',
    ward: 'TAN_DINH',
    address: '12 Nguyễn Huệ',
    email: 'contact@abc.vn',
    verifyToken: 'vt',
    ...overrides,
  };
}

describe('BusinessRegistrationService', () => {
  let service: BusinessRegistrationService;
  let redis: Record<string, any>;
  let enterpriseRepository: Record<string, any>;
  let userService: Record<string, any>;
  let mailService: Record<string, any>;

  beforeEach(() => {
    redis = {
      acquireOtpCooldown: vi.fn().mockResolvedValue(true),
      incrementOtpAttempts: vi.fn().mockResolvedValue(1),
      clearOtpAttempts: vi.fn().mockResolvedValue(undefined),
      setTemp: vi.fn().mockResolvedValue(undefined),
      getTemp: vi.fn().mockResolvedValue(null),
      deleteTemp: vi.fn().mockResolvedValue(undefined),
    };
    enterpriseRepository = { exists: vi.fn().mockResolvedValue(false) };
    userService = {
      findByUsername: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
    };
    mailService = { send: vi.fn().mockResolvedValue(undefined) };

    service = new BusinessRegistrationService(
      enterpriseRepository as any,
      userService as any,
      redis as any,
      mailService as any,
      new ConfigService({}),
      {} as any,
    );
  });

  describe('sendOtp', () => {
    it('rejects a tax code that is already registered', async () => {
      enterpriseRepository.exists.mockResolvedValueOnce(true);
      await expect(
        service.sendOtp({ email: 'contact@abc.vn', taxCode: '0101234567' }),
      ).rejects.toMatchObject({ response: { code: 'TAX_CODE_EXISTS' } });
      expect(mailService.send).not.toHaveBeenCalled();
    });

    it('rejects resending within the cooldown window', async () => {
      redis.acquireOtpCooldown.mockResolvedValue(false);
      await expect(
        service.sendOtp({ email: 'contact@abc.vn', taxCode: '0101234567' }),
      ).rejects.toMatchObject({ response: { code: 'OTP_RESEND_TOO_SOON' } });
    });

    it('stores the OTP under the lower-cased email and sends it', async () => {
      await service.sendOtp({ email: 'Contact@ABC.vn', taxCode: '0101234567' });
      expect(redis.setTemp).toHaveBeenCalledWith(
        'reg_otp:contact@abc.vn',
        expect.stringMatching(/^\d{6}$/),
        300,
      );
      expect(mailService.send).toHaveBeenCalledWith('contact@abc.vn', expect.any(String), expect.any(String));
    });
  });

  describe('verifyOtp', () => {
    it('returns OTP_EXPIRED when no OTP is stored', async () => {
      await expect(
        service.verifyOtp({ email: 'contact@abc.vn', otp: '123456' }),
      ).rejects.toMatchObject({ response: { code: 'OTP_EXPIRED' } });
    });

    it('returns OTP_INVALID on a wrong code', async () => {
      redis.getTemp.mockResolvedValue('111111');
      await expect(
        service.verifyOtp({ email: 'contact@abc.vn', otp: '123456' }),
      ).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
    });

    it('drops the OTP after too many wrong attempts', async () => {
      redis.getTemp.mockResolvedValue('111111');
      redis.incrementOtpAttempts.mockResolvedValue(5);
      await expect(
        service.verifyOtp({ email: 'contact@abc.vn', otp: '123456' }),
      ).rejects.toMatchObject({ response: { code: 'OTP_TOO_MANY_ATTEMPTS' } });
      expect(redis.deleteTemp).toHaveBeenCalledWith('reg_otp:contact@abc.vn');
    });

    it('issues a verifyToken bound to the email on a correct code', async () => {
      redis.getTemp.mockResolvedValue('123456');
      const result = await service.verifyOtp({ email: 'contact@abc.vn', otp: '123456' });
      expect(result.verifyToken).toMatch(/^[a-f0-9]{64}$/);
      expect(redis.setTemp).toHaveBeenCalledWith(
        `reg_vt:${result.verifyToken}`,
        'contact@abc.vn',
        1800,
      );
    });
  });

  describe('register', () => {
    it('rejects a main industry that is not level 4', async () => {
      redis.getTemp.mockResolvedValue('contact@abc.vn');
      await expect(
        service.register(baseDto({ mainIndustry: '62' }), {}),
      ).rejects.toMatchObject({ response: { code: 'INVALID_MAIN_INDUSTRY' } });
    });

    it('rejects a verifyToken issued for a different email', async () => {
      redis.getTemp.mockResolvedValue('other@abc.vn');
      await expect(service.register(baseDto(), {})).rejects.toMatchObject({
        response: { code: 'VERIFY_TOKEN_INVALID' },
      });
    });

    it('requires the business license file', async () => {
      redis.getTemp.mockResolvedValue('contact@abc.vn');
      await expect(service.register(baseDto(), {})).rejects.toMatchObject({
        response: { code: 'LICENSE_REQUIRED' },
      });
    });

    it('rejects a file whose content is not really a PDF/JPG/PNG', async () => {
      redis.getTemp.mockResolvedValue('contact@abc.vn');
      const fake = {
        originalname: 'license.pdf',
        mimetype: 'application/pdf',
        size: 10,
        buffer: Buffer.from('MZ executable'),
      };
      await expect(
        service.register(baseDto(), { businessLicense: [fake] }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_FILE_TYPE' } });
    });

    it('rejects files over 10MB', async () => {
      redis.getTemp.mockResolvedValue('contact@abc.vn');
      const big = {
        originalname: 'license.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024 + 1,
        buffer: PDF_BUFFER,
      };
      await expect(
        service.register(baseDto(), { businessLicense: [big] }),
      ).rejects.toMatchObject({ response: { code: 'FILE_TOO_LARGE' } });
    });
  });
});
