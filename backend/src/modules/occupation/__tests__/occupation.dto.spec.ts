import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CreateOccupationDto } from '../dto/create-occupation.dto.js';
import { UpdateOccupationDto } from '../dto/update-occupation.dto.js';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('Occupation DTO contract', () => {
  it('accepts create input without level', async () => {
    await expect(
      validationPipe.transform(
        {
          occupationCode: '1111',
          occupationName: 'Trưởng ban, Phó Trưởng ban',
          parentId: 111,
        },
        { type: 'body', metatype: CreateOccupationDto },
      ),
    ).resolves.toMatchObject({
      occupationCode: '1111',
      occupationName: 'Trưởng ban, Phó Trưởng ban',
      parentId: 111,
    });
  });

  it('accepts zero as a level-one occupation code', async () => {
    await expect(
      validationPipe.transform(
        { occupationCode: '0', occupationName: 'Lực lượng vũ trang' },
        { type: 'body', metatype: CreateOccupationDto },
      ),
    ).resolves.toMatchObject({ occupationCode: '0' });
  });

  it.each(['A1', '1.1', '12345'])('rejects invalid code %s', async (code) => {
    await expect(
      validationPipe.transform(
        { occupationCode: code, occupationName: 'Mẫu' },
        { type: 'body', metatype: CreateOccupationDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    [
      CreateOccupationDto,
      { occupationCode: '1', occupationName: '_Nghề nghiệp' },
    ],
    [UpdateOccupationDto, { occupationName: '.Nghề nghiệp' }],
  ])(
    'rejects a name starting with a special character',
    async (metatype, value) => {
      await expect(
        validationPipe.transform(value, { type: 'body', metatype }),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it.each([
    [
      CreateOccupationDto,
      { occupationCode: '1', occupationName: 'Mẫu', level: 1 },
    ],
    [UpdateOccupationDto, { occupationName: 'Mẫu', parentId: 1 }],
    [UpdateOccupationDto, { occupationName: 'Mẫu', occupationCode: '2' }],
  ])('rejects server-managed fields in %s input', async (metatype, value) => {
    await expect(
      validationPipe.transform(value, { type: 'body', metatype }),
    ).rejects.toThrow(BadRequestException);
  });
});
