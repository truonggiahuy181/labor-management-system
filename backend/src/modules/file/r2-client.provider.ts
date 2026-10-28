import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';

export const R2_CLIENT = Symbol('R2_CLIENT');

export function createR2Client(configService: ConfigService): S3Client {
  const accountId = configService.get<string>('R2_ACCOUNT_ID')?.trim();
  const accessKeyId = configService.get<string>('R2_ACCESS_KEY_ID')?.trim();
  const secretAccessKey = configService
    .get<string>('R2_SECRET_ACCESS_KEY')
    ?.trim();

  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error(
      'R2_ACCESS_KEY_ID và R2_SECRET_ACCESS_KEY phải được cấu hình cùng nhau.',
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export const r2ClientProvider: Provider = {
  provide: R2_CLIENT,
  inject: [ConfigService],
  useFactory: createR2Client,
};
