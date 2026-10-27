import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateEnterpriseDto } from '../dto/create-enterprise.dto.js';
import { UpdateEnterpriseDto } from '../dto/update-enterprise.dto.js';

const createDto = (
  overrides: Partial<CreateEnterpriseDto> = {},
): CreateEnterpriseDto =>
  plainToInstance(CreateEnterpriseDto, {
    enterpriseName: 'Công ty TNHH ABC',
    taxCode: '0101234567',
    businessTypeId: 1,
    industryId: 1,
    registrationDate: '2020-01-15',
    provinceId: '79',
    wardId: '26734',
    address: '12 Nguyễn Huệ',
    email: 'contact@abc.vn',
    ...overrides,
  });

describe('CreateEnterpriseDto', () => {
  it('rejects strings that exceed the database field limits', async () => {
    const dto = createDto({
      enterpriseName: 'a'.repeat(256),
      foreignName: 'a'.repeat(256),
      address: 'a'.repeat(256),
      operatingAddress: 'a'.repeat(256),
      email: `${'a'.repeat(90)}@example.com`,
      representativeName: 'a'.repeat(101),
      provinceId: 'a'.repeat(21),
      wardId: 'a'.repeat(21),
      operatingProvinceId: 'a'.repeat(21),
      operatingWardId: 'a'.repeat(21),
    });

    const errors = await validate(dto);
    const invalidProperties = errors
      .filter((error) => error.constraints?.maxLength)
      .map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining([
        'enterpriseName',
        'foreignName',
        'address',
        'operatingAddress',
        'email',
        'representativeName',
        'provinceId',
        'wardId',
        'operatingProvinceId',
        'operatingWardId',
      ]),
    );
  });

  it('accepts a valid office phone number', async () => {
    const errors = await validate(createDto({ phoneNumber: '0912345678' }));

    expect(
      errors.find((error) => error.property === 'phoneNumber'),
    ).toBeUndefined();
  });

  it('rejects an invalid office phone number', async () => {
    const errors = await validate(createDto({ phoneNumber: 'invalid-phone' }));

    expect(
      errors.find((error) => error.property === 'phoneNumber')?.constraints,
    ).toHaveProperty('matches');
  });
});

describe('UpdateEnterpriseDto', () => {
  it('rejects taxCode and email because they are immutable', async () => {
    const dto = plainToInstance(UpdateEnterpriseDto, {
      enterpriseName: 'Công ty ABC cập nhật',
      taxCode: '0109999999',
      email: 'new@abc.vn',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'taxCode',
          constraints: expect.objectContaining({
            whitelistValidation: expect.any(String),
          }),
        }),
        expect.objectContaining({
          property: 'email',
          constraints: expect.objectContaining({
            whitelistValidation: expect.any(String),
          }),
        }),
      ]),
    );
  });
});
