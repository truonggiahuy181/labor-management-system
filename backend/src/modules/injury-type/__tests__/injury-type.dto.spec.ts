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
  it('accepts one code segment and no client-managed level', async () => {
    await expect(
      validationPipe.transform(
        {
          codeSegment: '0',
          injuryTypeName: 'Chấn thương sọ não',
          parentId: 11,
        },
        { type: 'body', metatype: CreateInjuryTypeDto },
      ),
    ).resolves.toMatchObject({
      codeSegment: '0',
      injuryTypeName: 'Chấn thương sọ não',
      parentId: 11,
    });
  });

  it.each(['A', '10', '', '1.1'])('rejects invalid code segment %s', async (codeSegment) => {
    await expect(
      validationPipe.transform(
        { codeSegment, injuryTypeName: 'Mẫu' },
        { type: 'body', metatype: CreateInjuryTypeDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    [
      CreateInjuryTypeDto,
      { codeSegment: '1', injuryTypeName: 'Mẫu', level: 1 },
    ],
    [
      CreateInjuryTypeDto,
      { injuryTypeCode: '110', codeSegment: '0', injuryTypeName: 'Mẫu' },
    ],
    [UpdateInjuryTypeDto, { injuryTypeName: 'Mẫu', parentId: 1 }],
    [UpdateInjuryTypeDto, { injuryTypeName: 'Mẫu', injuryTypeCode: '2' }],
  ])('rejects server-managed fields in %s input', async (metatype, value) => {
    await expect(
      validationPipe.transform(value, { type: 'body', metatype }),
    ).rejects.toThrow(BadRequestException);
  });
});
