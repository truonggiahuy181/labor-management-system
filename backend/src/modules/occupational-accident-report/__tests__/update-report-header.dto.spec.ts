import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateReportHeaderDto } from '../dto/update-report-header.dto.js';

const makeDto = (totalEmployees: unknown, femaleEmployees: unknown = 0) =>
  plainToInstance(UpdateReportHeaderDto, {
    totalEmployees,
    femaleEmployees,
    payrollFundVnd: '1000',
    noAccidentsDeclared: true,
  });

describe('UpdateReportHeaderDto workforce validation', () => {
  it.each([undefined, null, '', 0, -1, 1.5, 2_147_483_648])(
    'rejects invalid total employees %s',
    async (totalEmployees) => {
      const errors = await validate(makeDto(totalEmployees));
      expect(errors.map((error) => error.property)).toContain('totalEmployees');
    },
  );

  it.each([1, 100, 2_147_483_647])(
    'accepts positive integer total employees %s with no female employees',
    async (totalEmployees) => {
      await expect(validate(makeDto(totalEmployees))).resolves.toHaveLength(0);
    },
  );

  it.each([-1, 1.5, 2_147_483_648])(
    'rejects invalid female employees %s',
    async (femaleEmployees) => {
      const errors = await validate(makeDto(100, femaleEmployees));
      expect(errors.map((error) => error.property)).toContain(
        'femaleEmployees',
      );
    },
  );

  it.each([undefined, null, '', '0', '0000', '-1', '1.5', 'NaN', '1e3', 1000])(
    'rejects an invalid or zero payroll %s',
    async (payrollFundVnd) => {
      const dto = plainToInstance(UpdateReportHeaderDto, {
        ...makeDto(10),
        payrollFundVnd,
      });
      const errors = await validate(dto);
      expect(errors.map((error) => error.property)).toContain('payrollFundVnd');
    },
  );

  it.each(['1', '0001', '1000000', '9223372036854775807'])(
    'accepts positive integer payroll %s',
    async (payrollFundVnd) => {
      const dto = plainToInstance(UpdateReportHeaderDto, {
        ...makeDto(10),
        payrollFundVnd,
      });
      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );
});
