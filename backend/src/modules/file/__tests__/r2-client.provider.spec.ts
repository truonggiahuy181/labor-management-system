import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { createR2Client } from '../r2-client.provider.js';

describe('R2 client provider', () => {
  it('cấu hình endpoint, region và checksum tương thích R2', async () => {
    const client = createR2Client(
      createConfigService({
        R2_ACCOUNT_ID: 'account-id',
        R2_ACCESS_KEY_ID: 'access-key',
        R2_SECRET_ACCESS_KEY: 'secret-key',
      }),
    );

    await expect(client.config.region()).resolves.toBe('auto');
    await expect(client.config.requestChecksumCalculation()).resolves.toBe(
      'WHEN_REQUIRED',
    );
    await expect(client.config.responseChecksumValidation()).resolves.toBe(
      'WHEN_REQUIRED',
    );
    await expect(client.config.endpoint!()).resolves.toMatchObject({
      protocol: 'https:',
      hostname: 'account-id.r2.cloudflarestorage.com',
    });
  });

  it('từ chối khi chỉ cấu hình một nửa credentials', () => {
    expect(() =>
      createR2Client(
        createConfigService({
          R2_ACCOUNT_ID: 'account-id',
          R2_ACCESS_KEY_ID: 'access-key',
        }),
      ),
    ).toThrow(/R2_ACCESS_KEY_ID.*R2_SECRET_ACCESS_KEY/);
  });
});

function createConfigService(values: Record<string, string>): ConfigService {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
