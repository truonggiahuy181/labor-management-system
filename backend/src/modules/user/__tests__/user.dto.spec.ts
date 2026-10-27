import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';

const validationOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
};

describe('User DTO relationship rules', () => {
  it('rejects enterpriseId when creating a user directly', async () => {
    const dto = plainToInstance(CreateUserDto, {
      username: 'internal-user',
      password: '12345678',
      fullName: 'Internal User',
      email: 'internal@example.com',
      roleId: 1,
      enterpriseId: 10,
    });

    const errors = await validate(dto, validationOptions);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'enterpriseId' }),
      ]),
    );
  });

  it.each(['roleId', 'enterpriseId'])(
    'rejects %s when updating a user',
    async (property) => {
      const dto = plainToInstance(UpdateUserDto, { [property]: 1 });

      const errors = await validate(dto, validationOptions);

      expect(errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ property })]),
      );
    },
  );
});
