import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { SaveAccidentCaseDto } from '../dto/save-accident-case.dto.js';

describe('SaveAccidentCaseDto', () => {
  const body = {
    primaryCauseId: 1,
    injuryFactorId: 3,
    medicalCostVnd: '0',
    salaryCostVnd: '0',
    compensationCostVnd: '0',
    propertyDamageVnd: '0',
    lostWorkDays: 0,
    victimGroups: [
      {
        occupationId: 100,
        isUnderEnterpriseManagement: true,
        victimCount: 1,
        femaleCount: 0,
        deathCount: 0,
        severeCount: 0,
      },
    ],
  };

  it('accepts a complete case without an accident date', async () => {
    await expect(
      validate(plainToInstance(SaveAccidentCaseDto, body)),
    ).resolves.toHaveLength(0);
  });

  it('continues validating dates supplied by older clients', async () => {
    const errors = await validate(
      plainToInstance(SaveAccidentCaseDto, {
        ...body,
        accidentDate: 'invalid-date',
      }),
    );
    expect(errors.map((error) => error.property)).toContain('accidentDate');
  });
});
