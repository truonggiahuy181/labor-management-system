import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateEnterpriseDto } from '../dto/create-enterprise.dto.js';
import { UpdateEnterpriseDto } from '../dto/update-enterprise.dto.js';
import { EnterpriseFileParamDto } from '../dto/enterprise-file-param.dto.js';

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
    wardId: '26740',
    address: '12 Nguyễn Huệ',
    email: 'contact@abc.vn',
    phoneNumber: '0912345678',
    operatingProvinceId: '79',
    operatingWardId: '26740',
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

  it.each([
    ['phoneNumber', { phoneNumber: undefined }],
    ['operatingProvinceId', { operatingProvinceId: undefined }],
    ['operatingWardId', { operatingWardId: undefined }],
  ])('requires %s when creating an enterprise', async (property, overrides) => {
    const errors = await validate(createDto(overrides));

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property })]),
    );
  });

  it.each(['0001-09-09', '1899-12-31'])(
    'rejects registration date %s before 01/01/1900',
    async (registrationDate) => {
      const errors = await validate(createDto({ registrationDate }));

      expect(
        errors.find((error) => error.property === 'registrationDate')?.constraints,
      ).toHaveProperty('isNotBeforeDate');
    },
  );

  it('accepts the minimum registration date', async () => {
    const errors = await validate(
      createDto({ registrationDate: '1900-01-01' }),
    );

    expect(
      errors.find((error) => error.property === 'registrationDate'),
    ).toBeUndefined();
  });

  it('rejects a registration date in the future', async () => {
    const errors = await validate(
      createDto({ registrationDate: '9999-12-31' }),
    );

    expect(
      errors.find((error) => error.property === 'registrationDate')?.constraints,
    ).toHaveProperty('isNotFutureDate');
  });
});

describe('UpdateEnterpriseDto', () => {
  it('rejects taxCode because it is immutable', async () => {
    const dto = plainToInstance(UpdateEnterpriseDto, {
      enterpriseName: 'Công ty ABC cập nhật',
      taxCode: '0109999999',
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
      ]),
    );
  });

  it('accepts a valid email and rejects an invalid one', async () => {
    const validate$ = (email: string) =>
      validate(plainToInstance(UpdateEnterpriseDto, { email }), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

    expect(await validate$('new@abc.vn')).toHaveLength(0);
    expect(await validate$('not-an-email')).toEqual([
      expect.objectContaining({ property: 'email' }),
    ]);
  });

  it.each([
    ['phoneNumber', { phoneNumber: null }],
    ['operatingProvinceId', { operatingProvinceId: null }],
    ['operatingWardId', { operatingWardId: null }],
  ])(
    'rejects null for required contact/operating field %s when updating an enterprise',
    async (property, payload) => {
      const dto = plainToInstance(UpdateEnterpriseDto, payload);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ property })]),
      );
    },
  );
});

describe('EnterpriseFileParamDto', () => {
  it.each(['businessLicense', 'otherDocument'])(
    'accepts the supported file type %s',
    async (fileType) => {
      const dto = plainToInstance(EnterpriseFileParamDto, {
        id: '10',
        fileType,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
      expect(dto.id).toBe(10);
    },
  );

  it('rejects unsupported file types', async () => {
    const dto = plainToInstance(EnterpriseFileParamDto, {
      id: '10',
      fileType: 'avatar',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
