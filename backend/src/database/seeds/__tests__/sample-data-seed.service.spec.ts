import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SampleDataSeedService } from '../sample-data-seed.service.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-enterprise-password'),
}));

describe('SampleDataSeedService', () => {
  let manager: { query: ReturnType<typeof vi.fn> };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    manager = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT DISTINCT ON')) {
          return [{ province_code: '01', ward_code: '00004' }];
        }
        if (sql.includes("role_code = 'ENTERPRISE_USER'")) {
          return [{ id: 2 }];
        }
        if (sql.includes('COUNT(*)::text') && sql.includes('INNER JOIN')) {
          return [{ count: '30' }];
        }
        if (sql.includes('COUNT(*)::text')) {
          return [{ count: '30' }];
        }
        return [];
      }),
    };
    dataSource = {
      transaction: vi.fn(async (callback) => callback(manager)),
    };
  });

  const createService = (overrides: Record<string, string> = {}) => {
    const values: Record<string, string> = {
      NODE_ENV: 'development',
      SEED_SAMPLE_DATA: 'true',
      SEED_PAGINATION_RECORDS: '30',
      SEED_ENTERPRISE_PASSWORD: '12345678',
      ...overrides,
    };
    const configService = {
      get: vi.fn((key: string, defaultValue?: string) =>
        values[key] === undefined ? defaultValue : values[key],
      ),
    };

    return new SampleDataSeedService(dataSource as any, configService as any);
  };

  it('does not seed when sample data is disabled', async () => {
    await createService({ SEED_SAMPLE_DATA: 'false' }).onApplicationBootstrap();

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not seed outside development', async () => {
    await createService({ NODE_ENV: 'production' }).onApplicationBootstrap();

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates reference data and enough users and enterprises for pagination', async () => {
    await createService().onApplicationBootstrap();

    expect(dataSource.transaction).toHaveBeenCalledOnce();
    const enterpriseInsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO enterprises'),
    );
    const userInsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO users'),
    );
    const reportPeriodInsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO report_periods'),
    );
    const injuryFactorInsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO injury_factors'),
    );
    const injuryTypeInserts = manager.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO injury_types'),
    );
    const occupationInserts = manager.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO occupations'),
    );
    const industryInserts = manager.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO industries'),
    );
    const enterpriseRows = JSON.parse(enterpriseInsert?.[1]?.[0] as string);
    const reportPeriodRows = JSON.parse(reportPeriodInsert?.[1]?.[0] as string);
    const injuryFactorRows = JSON.parse(injuryFactorInsert?.[1]?.[0] as string);
    const injuryTypeRows = injuryTypeInserts.flatMap(([, parameters]) =>
      JSON.parse(parameters?.[0] as string),
    );
    const occupationRows = occupationInserts.flatMap(([, parameters]) =>
      JSON.parse(parameters?.[0] as string),
    );
    const industryRows = industryInserts.flatMap(([, parameters]) =>
      JSON.parse(parameters?.[0] as string),
    );

    expect(enterpriseRows).toHaveLength(30);
    expect(reportPeriodRows).toHaveLength(12);
    expect(injuryFactorRows).toHaveLength(9);
    expect(injuryTypeInserts).toHaveLength(3);
    expect(injuryTypeRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          injury_type_code: '1',
          parent_code: null,
          level: 1,
          is_active: true,
        }),
        expect.objectContaining({
          injury_type_code: '110',
          parent_code: '11',
          level: 3,
          is_active: true,
        }),
        expect.objectContaining({
          injury_type_code: '610',
          parent_code: '61',
          level: 3,
          is_active: false,
        }),
      ]),
    );
    expect(occupationInserts).toHaveLength(4);
    expect(occupationRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          occupation_code: '0',
          parent_code: null,
          level: 1,
          is_active: true,
        }),
        expect.objectContaining({
          occupation_code: '1111',
          parent_code: '111',
          level: 4,
          is_active: true,
        }),
        expect.objectContaining({
          occupation_code: '9629',
          parent_code: '962',
          level: 4,
          is_active: false,
        }),
      ]),
    );
    expect(industryInserts).toHaveLength(4);
    expect(industryRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          industry_code: 'J',
          parent_code: null,
          level: 1,
          is_active: true,
        }),
        expect.objectContaining({
          industry_code: '6201',
          parent_code: '620',
          level: 4,
          is_active: true,
        }),
        expect.objectContaining({
          industry_code: '6312',
          parent_code: '631',
          level: 4,
          is_active: false,
        }),
        expect.objectContaining({
          industry_code: '9700',
          parent_code: '970',
          level: 4,
          is_active: false,
        }),
      ]),
    );
    expect(enterpriseRows[0]).toMatchObject({
      tax_code: '0990000001',
      enterprise_name: 'Công ty TNHH Công nghệ Sao Việt',
      business_type_code: 'TNHH2',
      industry_code: '6201',
      province_code: '01',
      ward_code: '00004',
      is_active: true,
    });
    expect(enterpriseRows[7]).toMatchObject({
      enterprise_name: 'Doanh nghiệp Tư nhân Nội thất Gia Bảo',
      business_type_code: 'DNTN',
      industry_code: '3100',
    });
    expect(enterpriseRows[26]).toMatchObject({
      enterprise_name: 'Công ty Hợp danh Luật Minh Tâm',
      business_type_code: 'HD',
      industry_code: '6910',
    });
    expect(enterpriseRows[4].is_active).toBe(false);
    expect(enterpriseInsert?.[0]).toContain('ON CONFLICT (tax_code) DO UPDATE');
    expect(userInsert?.[1]).toEqual([
      expect.any(String),
      'hashed-enterprise-password',
      2,
    ]);
  });

  it('rejects an invalid pagination record count', async () => {
    await expect(
      createService({
        SEED_PAGINATION_RECORDS: 'invalid',
      }).onApplicationBootstrap(),
    ).rejects.toThrow('SEED_PAGINATION_RECORDS must be a positive integer.');

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
