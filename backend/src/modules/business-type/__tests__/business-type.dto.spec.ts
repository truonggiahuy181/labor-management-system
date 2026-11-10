import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateBusinessTypeDto } from '../dto/create-business-type.dto.js';
import { UpdateBusinessTypeDto } from '../dto/update-business-type.dto.js';

describe('Business type DTO contract', () => {
  it.each([
    [CreateBusinessTypeDto, { typeCode: 'TNHH', typeName: '_Công ty' }],
    [UpdateBusinessTypeDto, { typeName: '-Công ty' }],
  ])(
    'rejects a name starting with a special character',
    async (metatype, value) => {
      const errors = await validate(plainToInstance(metatype, value));

      expect(errors).not.toHaveLength(0);
    },
  );

  it.each(['Công ty cổ phần', '1 thành viên'])(
    'accepts a name starting with a letter or number',
    async (typeName) => {
      const dto = plainToInstance(CreateBusinessTypeDto, {
        typeCode: 'TNHH',
        typeName,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );
});
