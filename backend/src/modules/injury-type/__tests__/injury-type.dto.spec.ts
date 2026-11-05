import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CreateInjuryTypeDto } from '../dto/create-injury-type.dto.js';
import { UpdateInjuryTypeDto } from '../dto/update-injury-type.dto.js';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('Injury type DTO contract', () => {
  it('accepts create input without level', async () => {
    await expect(
      validationPipe.transform(
        {
          injuryTypeCode: '110',
          injuryTypeName: 'Chấn thương sọ não',
          parentId: 11,
        },
        { type: 'body', metatype: CreateInjuryTypeDto },
      ),
    ).resolves.toMatchObject({
      injuryTypeCode: '110',
      injuryTypeName: 'Chấn thương sọ não',
      parentId: 11,
    });
  });

  it.each(['A1', '1.1', '1234'])('rejects invalid code %s', async (code) => {
    await expect(
      validationPipe.transform(
        { injuryTypeCode: code, injuryTypeName: 'Mẫu' },
        { type: 'body', metatype: CreateInjuryTypeDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    [
      CreateInjuryTypeDto,
      { injuryTypeCode: '1', injuryTypeName: 'Mẫu', level: 1 },
    ],
    [UpdateInjuryTypeDto, { injuryTypeName: 'Mẫu', parentId: 1 }],
    [UpdateInjuryTypeDto, { injuryTypeName: 'Mẫu', injuryTypeCode: '2' }],
  ])('rejects server-managed fields in %s input', async (metatype, value) => {
    await expect(
      validationPipe.transform(value, { type: 'body', metatype }),
    ).rejects.toThrow(BadRequestException);
  });
});
