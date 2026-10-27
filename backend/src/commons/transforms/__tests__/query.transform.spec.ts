import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { RoleQueryDto } from '../../../modules/role/dto/role-query.dto.js';
import { BusinessTypeQueryDto } from '../../../modules/business-type/dto/business-type-query.dto.js';
import { IndustryQueryDto } from '../../../modules/industry/dto/industry-query.dto.js';
import { EnterpriseQueryDto } from '../../../modules/enterprise/dto/enterprise-query.dto.js';
import { UserQueryDto } from '../../../modules/user/dto/user-query.dto.js';

const transform = <T extends object>(type: new () => T, value: object): T =>
  plainToInstance(type, value, { enableImplicitConversion: true });

describe('boolean query transform', () => {
  it.each([
    RoleQueryDto,
    BusinessTypeQueryDto,
    IndustryQueryDto,
    EnterpriseQueryDto,
    UserQueryDto,
  ])('keeps isActive=false for %s', (QueryDto) => {
    expect(transform(QueryDto, { isActive: 'false' }).isActive).toBe(false);
    expect(transform(QueryDto, { isActive: 'true' }).isActive).toBe(true);
  });

  it('keeps includeInactive=false instead of coercing it to true', () => {
    expect(
      transform(BusinessTypeQueryDto, { includeInactive: 'false' })
        .includeInactive,
    ).toBe(false);
    expect(
      transform(IndustryQueryDto, { includeInactive: 'false' }).includeInactive,
    ).toBe(false);
  });
});
