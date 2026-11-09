import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SampleDataSeedService } from '../sample-data-seed.service.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-enterprise-password'),
}));

describe('SampleDataSeedService', () => {
  let manager: { query: ReturnType<typeof vi.fn> };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let seededBusinessTypeRows: Array<{
    type_code: string;
    type_name: string;
    is_active: boolean;
    deleted_at: null;
  }>;
  let seededOccupationRows: Array<{
    occupation_code: string;
    occupation_name: string;
    parent_code: string | null;
    level: number;
    is_active: boolean;
  }>;
  let seededIndustryRows: Array<{
    industry_code: string;
    industry_name: string;
    parent_code: string | null;
    level: number;
  }>;
  let seededRoleRows: Array<{
    role_code: string;
    role_name: string;
    is_active: boolean;
    deleted_at: null;
  }>;

  beforeEach(() => {
    seededBusinessTypeRows = [];
    seededOccupationRows = [];
    seededIndustryRows = [];
    seededRoleRows = [];
    manager = {
      query: vi.fn(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('INSERT INTO roles')) {
          seededRoleRows.push(
            ...JSON.parse(parameters?.[0] as string).map(
              (row: { role_code: string; role_name: string }) => ({
                ...row,
                is_active: true,
                deleted_at: null,
              }),
            ),
          );
          return [];
        }
        if (sql.includes('FROM roles') && sql.includes('role_code = ANY')) {
          return seededRoleRows;
        }
        if (
          sql.includes('(SELECT COUNT(*)::int FROM provinces') &&
          sql.includes('(SELECT COUNT(*)::int FROM wards')
        ) {
          return [{ province_count: 34, ward_count: 3321 }];
        }
        if (sql.includes('SELECT DISTINCT ON')) {
          return [{ province_code: '01', ward_code: '00004' }];
        }
        if (sql.includes("role_code = 'ENTERPRISE_USER'")) {
          return [{ id: 2 }];
        }
        if (
          sql.includes('COUNT(*)::text') &&
          sql.includes('FROM occupational_accident_reports')
        ) {
          return [{ count: '6' }];
        }
        if (sql.includes('COUNT(*)::text') && sql.includes('INNER JOIN')) {
          return [{ count: '30' }];
        }
        if (sql.includes('COUNT(*)::text')) {
          return [{ count: '30' }];
        }
        if (
          sql.includes('SELECT users.username') &&
          sql.includes('INNER JOIN roles')
        ) {
          return [];
        }
        if (
          sql.includes('INSERT INTO users') &&
          sql.includes('RETURNING username')
        ) {
          return [{ username: 'admin_demo' }];
        }
        if (sql.includes('INSERT INTO business_types')) {
          const rows = JSON.parse(parameters?.[0] as string);
          seededBusinessTypeRows.push(
            ...rows.map((row: { type_code: string; type_name: string }) => ({
              ...row,
              is_active: true,
              deleted_at: null,
            })),
          );
          return [];
        }
        if (sql.includes('FROM business_types')) {
          return seededBusinessTypeRows;
        }
        if (sql.includes('INSERT INTO occupations')) {
          seededOccupationRows.push(...JSON.parse(parameters?.[0] as string));
          return [];
        }
        if (sql.includes('FROM occupations AS occupation')) {
          return seededOccupationRows;
        }
        if (sql.includes('INSERT INTO industries')) {
          seededIndustryRows.push(...JSON.parse(parameters?.[0] as string));
          return [];
        }
        if (
          sql.includes('FROM industries AS industry') &&
          sql.includes('parent.industry_code AS parent_code')
        ) {
          return seededIndustryRows;
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
      SEED_ADMIN_USERNAME: 'admin_demo',
      SEED_ADMIN_PASSWORD: 'Admin@123456',
      SEED_ADMIN_EMAIL: 'admin.demo@example.com',
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
    const accidentCauseInsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO accident_causes'),
    );
    const demoReportInsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO occupational_accident_reports'),
    );
    const businessTypeInsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO business_types'),
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
    const accidentCauseRows = JSON.parse(
      accidentCauseInsert?.[1]?.[0] as string,
    );
    const demoReportRows = JSON.parse(demoReportInsert?.[1]?.[0] as string);
    const businessTypeRows = JSON.parse(businessTypeInsert?.[1]?.[0] as string);
    const occupationRows = occupationInserts.flatMap(([, parameters]) =>
      JSON.parse(parameters?.[0] as string),
    );
    const industryRows = industryInserts.flatMap(([, parameters]) =>
      JSON.parse(parameters?.[0] as string),
    );

    expect(enterpriseRows).toHaveLength(30);
    const currentYear = new Date().getFullYear();
    expect(reportPeriodRows).toHaveLength(5);
    expect(reportPeriodRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          report_name: 'Báo cáo tai nạn lao động',
          report_year: currentYear,
          report_type_code: 'OCCUPATIONAL_ACCIDENT',
          period_code: 'FIRST_HALF',
          submission_start_date: `${currentYear}-07-01`,
          submission_end_date: `${currentYear}-07-04`,
        }),
        expect.objectContaining({
          report_name: 'Báo cáo tai nạn lao động (demo local)',
          report_year: currentYear,
          report_type_code: 'OCCUPATIONAL_ACCIDENT',
          period_code: 'ANNUAL',
          is_active: true,
        }),
      ]),
    );
    expect(accidentCauseRows).toHaveLength(8);
    expect(demoReportRows).toHaveLength(6);
    expect(demoReportRows.map((row: { status: string }) => row.status)).toEqual(
      expect.arrayContaining(['DRAFT', 'SUBMITTED', 'RECEIVED', 'RETURNED']),
    );
    expect(injuryFactorRows).toHaveLength(9);
    expect(businessTypeRows).toEqual([
      {
        type_code: 'TNHH1',
        type_name: 'Công ty TNHH một thành viên',
      },
      {
        type_code: 'TNHH2',
        type_name: 'Công ty TNHH hai thành viên trở lên',
      },
      { type_code: 'CTCP', type_name: 'Công ty cổ phần' },
      { type_code: 'HD', type_name: 'Công ty hợp danh' },
      { type_code: 'DNTN', type_name: 'Doanh nghiệp tư nhân' },
    ]);
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
    expect(occupationRows).toHaveLength(717);
    expect(
      Object.fromEntries(
        [1, 2, 3, 4].map((level) => [
          level,
          occupationRows.filter((row) => row.level === level).length,
        ]),
      ),
    ).toEqual({ 1: 10, 2: 48, 3: 152, 4: 507 });
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
          is_active: true,
        }),
      ]),
    );
    expect(industryInserts).toHaveLength(4);
    expect(industryRows).toHaveLength(863);
    expect(
      Object.fromEntries(
        [1, 2, 3, 4].map((level) => [
          level,
          industryRows.filter((row) => row.level === level).length,
        ]),
      ),
    ).toEqual({ 1: 22, 2: 87, 3: 259, 4: 495 });
    expect(industryRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          industry_code: 'J',
          parent_code: null,
          level: 1,
          is_active: true,
        }),
        expect.objectContaining({
          industry_code: '6219',
          parent_code: '621',
          level: 4,
          is_active: true,
        }),
        expect.objectContaining({
          industry_code: '6310',
          parent_code: '631',
          level: 4,
          is_active: true,
        }),
        expect.objectContaining({
          industry_code: '9700',
          parent_code: '970',
          level: 4,
          is_active: true,
        }),
      ]),
    );
    expect(enterpriseRows[0]).toMatchObject({
      tax_code: '0990000001',
      enterprise_name: 'Công ty TNHH Công nghệ Sao Việt',
      business_type_code: 'TNHH2',
      industry_code: '6219',
      province_code: '01',
      ward_code: '00004',
      is_active: true,
    });
    expect(enterpriseRows[7]).toMatchObject({
      enterprise_name: 'Doanh nghiệp Tư nhân Nội thất Gia Bảo',
      business_type_code: 'DNTN',
      industry_code: '3101',
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
