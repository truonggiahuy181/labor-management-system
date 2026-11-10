import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CreateIndustryDto } from '../dto/create-industry.dto.js';
import { UpdateIndustryDto } from '../dto/update-industry.dto.js';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('Industry DTO contract', () => {
  it('accepts an official full code without client-managed level', async () => {
    await expect(
      validationPipe.transform(
        {
          industryCode: '6201',
          industryName: 'Lập trình máy vi tính',
          parentId: 10,
        },
        { type: 'body', metatype: CreateIndustryDto },
      ),
    ).resolves.toMatchObject({
      industryCode: '6201',
      industryName: 'Lập trình máy vi tính',
      parentId: 10,
    });
  });

  it.each([
    [
      CreateIndustryDto,
      { industryCode: '6201', industryName: 'Mẫu', level: 4 },
    ],
    [UpdateIndustryDto, { industryName: 'Mẫu', level: 4 }],
  ])('rejects level in %s input', async (metatype, value) => {
    await expect(
      validationPipe.transform(value, { type: 'body', metatype }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects the legacy code-segment field', async () => {
    await expect(
      validationPipe.transform(
        { industryCode: '6201', codeSegment: '1', industryName: 'Mẫu' },
        { type: 'body', metatype: CreateIndustryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    [CreateIndustryDto, { industryCode: '12', industryName: '_Ngành nghề' }],
    [UpdateIndustryDto, { industryName: '@Ngành nghề' }],
  ])(
    'rejects a name starting with a special character',
    async (metatype, value) => {
      await expect(
        validationPipe.transform(value, { type: 'body', metatype }),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it.each([
    [CreateIndustryDto, { industryCode: '12', industryName: '' }],
    [UpdateIndustryDto, { industryName: '' }],
  ])(
    'returns a Vietnamese message when industryName is empty',
    async (metatype, value) => {
      await expect(
        validationPipe.transform(value, { type: 'body', metatype }),
      ).rejects.toMatchObject({
        response: {
          message: expect.arrayContaining([
            'Tên ngành nghề không được để trống',
          ]),
        },
      });
    },
  );
});
