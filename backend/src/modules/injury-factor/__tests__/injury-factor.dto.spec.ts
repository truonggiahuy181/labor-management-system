import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateInjuryFactorDto } from '../dto/create-injury-factor.dto.js';
import { InjuryFactorQueryDto } from '../dto/injury-factor-query.dto.js';

describe('CreateInjuryFactorDto', () => {
  it('accepts valid factor data', async () => {
    const dto = plainToInstance(CreateInjuryFactorDto, {
      factorCode: 'Mã 1',
      factorName: 'Điện',
      isActive: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects empty values', async () => {
    const dto = plainToInstance(CreateInjuryFactorDto, {
      factorCode: '',
      factorName: '',
    });
    const invalidProperties = (await validate(dto)).map(
      (error) => error.property,
    );

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['factorCode', 'factorName']),
    );
  });

  it('rejects values longer than database columns', async () => {
    const dto = plainToInstance(CreateInjuryFactorDto, {
      factorCode: 'a'.repeat(51),
      factorName: 'a'.repeat(256),
    });
    const invalidProperties = (await validate(dto)).map(
      (error) => error.property,
    );

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['factorCode', 'factorName']),
    );
  });
});

describe('InjuryFactorQueryDto', () => {
  it('transforms boolean query parameters', async () => {
    const dto = plainToInstance(InjuryFactorQueryDto, {
      isActive: 'false',
      includeInactive: 'true',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.isActive).toBe(false);
    expect(dto.includeInactive).toBe(true);
  });
});
