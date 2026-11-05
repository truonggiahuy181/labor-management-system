import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { DataSource, EntityManager } from 'typeorm';
import { buildIndustrySeedRows } from '../catalogs/industry-catalog.js';
import { INJURY_TYPE_CATALOG } from '../catalogs/injury-type-catalog.js';
import { OCCUPATION_CATALOG } from '../catalogs/occupation-catalog.js';

interface LocationPair {
  province_code: string;
  ward_code: string;
}

interface EnterpriseSeedRow {
  sequence: number;
  taxCode: string;
  enterpriseName: string;
  foreignName: string;
  businessTypeCode: string;
  industryCode: string;
  registrationDate: string;
  provinceCode: string;
  wardCode: string;
  address: string;
  email: string;
  phoneNumber: string;
  representativeName: string;
  representativePhone: string;
  isActive: boolean;
}

interface CompanyProfile {
  enterpriseName: string;
  foreignName: string;
  businessTypeCode: (typeof BUSINESS_TYPES)[number][0];
  industryCode: string;
}

const DEFAULT_PAGINATION_RECORDS = 30;
const MAX_PAGINATION_RECORDS = 100;
const DEFAULT_ENTERPRISE_PASSWORD = '12345678';

const BUSINESS_TYPES = [
  ['TNHH1', 'Công ty trách nhiệm hữu hạn một thành viên'],
  ['TNHH2', 'Công ty trách nhiệm hữu hạn hai thành viên trở lên'],
  ['CTCP', 'Công ty cổ phần'],
  ['DNTN', 'Doanh nghiệp tư nhân'],
  ['HD', 'Công ty hợp danh'],
] as const;

const REPRESENTATIVE_NAMES = [
  'Nguyễn Minh Anh',
  'Trần Hoàng Nam',
  'Lê Thu Hà',
  'Phạm Quốc Bảo',
  'Võ Ngọc Lan',
  'Đặng Gia Huy',
  'Bùi Thanh Mai',
  'Đỗ Đức Long',
  'Hồ Khánh Linh',
  'Ngô Tuấn Kiệt',
  'Dương Thảo Vy',
  'Lý Minh Quân',
  'Mai Ngọc Trâm',
  'Vũ Thành Đạt',
  'Tạ Phương Thảo',
  'Cao Nhật Minh',
  'Trịnh Bảo Châu',
  'Phan Anh Dũng',
  'Đinh Hải Yến',
  'Quách Hoàng Sơn',
  'Nguyễn Kim Ngân',
  'Trần Đức Phúc',
  'Lê Bảo Ngọc',
  'Phạm Minh Khang',
  'Võ Thanh Trúc',
  'Đặng Quốc Việt',
  'Bùi Hồng Nhung',
  'Đỗ Gia Bảo',
  'Hồ Minh Thư',
  'Ngô Khánh Toàn',
] as const;

const STREET_NAMES = [
  'Nguyễn Huệ',
  'Lê Lợi',
  'Trần Hưng Đạo',
  'Điện Biên Phủ',
  'Võ Nguyên Giáp',
  'Nguyễn Văn Linh',
  'Phan Chu Trinh',
  'Hai Bà Trưng',
  'Lý Thường Kiệt',
  'Hoàng Diệu',
  'Tôn Đức Thắng',
  'Quang Trung',
  'Nguyễn Trãi',
  'Phạm Văn Đồng',
  'Bạch Đằng',
] as const;

const COMPANY_PROFILES: readonly CompanyProfile[] = [
  {
    enterpriseName: 'Công ty TNHH Công nghệ Sao Việt',
    foreignName: 'Sao Viet Technology Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '6201',
  },
  {
    enterpriseName: 'Công ty Cổ phần Giải pháp Số Đông Dương',
    foreignName: 'Indochina Digital Solutions Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '6202',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Thương mại An Phát',
    foreignName: 'An Phat Trading One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '4690',
  },
  {
    enterpriseName: 'Công ty Cổ phần Đầu tư Minh Long',
    foreignName: 'Minh Long Investment Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '7020',
  },
  {
    enterpriseName: 'Công ty TNHH Logistics Đại Nam',
    foreignName: 'Dai Nam Logistics Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '4933',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Thực phẩm Hương Việt',
    foreignName: 'Huong Viet Food One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '1079',
  },
  {
    enterpriseName: 'Công ty Cổ phần Xây dựng Thành Công',
    foreignName: 'Thanh Cong Construction Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '4101',
  },
  {
    enterpriseName: 'Doanh nghiệp Tư nhân Nội thất Gia Bảo',
    foreignName: 'Gia Bao Furniture Private Enterprise',
    businessTypeCode: 'DNTN',
    industryCode: '3100',
  },
  {
    enterpriseName: 'Công ty TNHH Du lịch Biển Xanh',
    foreignName: 'Blue Sea Travel Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '7912',
  },
  {
    enterpriseName: 'Công ty Cổ phần Giáo dục Khai Minh',
    foreignName: 'Khai Minh Education Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '8559',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Nông nghiệp Xanh Việt',
    foreignName: 'Viet Green Agriculture One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '0118',
  },
  {
    enterpriseName: 'Công ty TNHH Truyền thông Mặt Trời',
    foreignName: 'Sun Media Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '7310',
  },
  {
    enterpriseName: 'Công ty Cổ phần Dược phẩm An Khang',
    foreignName: 'An Khang Pharmaceutical Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '4772',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Cơ khí Chính Xác Việt',
    foreignName: 'Viet Precision Mechanical One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '2592',
  },
  {
    enterpriseName: 'Công ty TNHH Kiến trúc Không Gian Mới',
    foreignName: 'New Space Architecture Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '7110',
  },
  {
    enterpriseName: 'Công ty Cổ phần Bất động sản Phú Gia',
    foreignName: 'Phu Gia Real Estate Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '6810',
  },
  {
    enterpriseName: 'Công ty TNHH Vận tải Hoàng Gia',
    foreignName: 'Hoang Gia Transport Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '4933',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Mỹ phẩm Thiên Nhiên',
    foreignName: 'Natural Cosmetics One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '2023',
  },
  {
    enterpriseName: 'Công ty Cổ phần Năng lượng Á Châu',
    foreignName: 'Asia Energy Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '3511',
  },
  {
    enterpriseName: 'Công ty TNHH Điện tử Nam Việt',
    foreignName: 'Nam Viet Electronics Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '2610',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Nội thất Mộc Việt',
    foreignName: 'Moc Viet Furniture One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '3100',
  },
  {
    enterpriseName: 'Công ty Cổ phần Phần mềm Tiên Phong',
    foreignName: 'Tien Phong Software Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '6201',
  },
  {
    enterpriseName: 'Công ty TNHH Nhà hàng Hương Quê',
    foreignName: 'Huong Que Restaurant Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '5610',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Xuất nhập khẩu Đại Phúc',
    foreignName: 'Dai Phuc Import Export One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '4690',
  },
  {
    enterpriseName: 'Công ty Cổ phần Tư vấn Quản lý Vạn Thành',
    foreignName: 'Van Thanh Management Consulting Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '7020',
  },
  {
    enterpriseName: 'Công ty TNHH Thiết kế Sáng Tạo',
    foreignName: 'Creative Design Company Limited',
    businessTypeCode: 'TNHH2',
    industryCode: '7410',
  },
  {
    enterpriseName: 'Công ty Hợp danh Luật Minh Tâm',
    foreignName: 'Minh Tam Law Partnership Company',
    businessTypeCode: 'HD',
    industryCode: '6910',
  },
  {
    enterpriseName: 'Doanh nghiệp Tư nhân Vận tải Tân Lập',
    foreignName: 'Tan Lap Transport Private Enterprise',
    businessTypeCode: 'DNTN',
    industryCode: '4933',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Chăm sóc Sức khỏe Bình An',
    foreignName: 'Binh An Healthcare One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '8699',
  },
  {
    enterpriseName: 'Công ty Cổ phần Thương mại Quốc tế Việt Thịnh',
    foreignName: 'Viet Thinh International Trading Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '4690',
  },
];

const REPORT_PERIODS = [
  {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2025,
    reportPeriod: '6 tháng đầu năm',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    isActive: false,
  },
  {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2025,
    reportPeriod: 'Cả năm',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    isActive: false,
  },
  {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2026,
    reportPeriod: '6 tháng đầu năm',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    isActive: true,
  },
  {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2026,
    reportPeriod: 'Cả năm',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
  },
  {
    reportName: 'Báo cáo tình hình sử dụng lao động',
    reportYear: 2025,
    reportPeriod: '6 tháng cuối năm',
    startDate: '2025-07-01',
    endDate: '2025-12-31',
    isActive: false,
  },
  {
    reportName: 'Báo cáo tình hình sử dụng lao động',
    reportYear: 2026,
    reportPeriod: '6 tháng đầu năm',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    isActive: true,
  },
  {
    reportName: 'Báo cáo tình hình sử dụng lao động',
    reportYear: 2026,
    reportPeriod: '6 tháng cuối năm',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    isActive: true,
  },
  {
    reportName: 'Báo cáo công tác an toàn, vệ sinh lao động',
    reportYear: 2025,
    reportPeriod: 'Cả năm',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    isActive: false,
  },
  {
    reportName: 'Báo cáo công tác an toàn, vệ sinh lao động',
    reportYear: 2026,
    reportPeriod: 'Cả năm',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
  },
  {
    reportName: 'Báo cáo biến động lao động',
    reportYear: 2026,
    reportPeriod: '6 tháng đầu năm',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    isActive: true,
  },
  {
    reportName: 'Báo cáo biến động lao động',
    reportYear: 2026,
    reportPeriod: '6 tháng cuối năm',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    isActive: true,
  },
  {
    reportName: 'Báo cáo sử dụng lao động nước ngoài',
    reportYear: 2026,
    reportPeriod: 'Cả năm',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
  },
] as const;

const INJURY_FACTORS = [
  ['Mã 1', 'Điện'],
  ['Mã 2', 'Phóng xạ'],
  ['Mã 3', 'Thiết bị áp lực'],
  ['Mã 4', 'Thiết bị nâng'],
  [
    'Mã 5',
    'Bộ phận truyền động, chuyển động của máy, thiết bị gây cán, cuốn, đè, kẹp, cắt, va đập',
  ],
  ['Mã 6', 'Vật văng bắn'],
  ['Mã 7', 'Vật rơi, đổ, sập'],
  ['Mã 8', 'Sập đổ công trình, giàn giáo'],
  ['Mã 9', 'Sập lò, sập đất đá'],
] as const;

@Injectable()
export class SampleDataSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SampleDataSeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';
    const isEnabled =
      this.configService.get<string>('SEED_SAMPLE_DATA', 'false') === 'true';

    if (!isDevelopment || !isEnabled) {
      return;
    }

    const recordCount = this.getRecordCount();
    const password = this.configService.get<string>(
      'SEED_ENTERPRISE_PASSWORD',
      DEFAULT_ENTERPRISE_PASSWORD,
    );
    if (password.length < 8) {
      throw new Error(
        'SEED_ENTERPRISE_PASSWORD must contain at least 8 characters.',
      );
    }

    const passwordHash = await argon2.hash(password);
    const result = await this.dataSource.transaction((manager) =>
      this.seed(manager, recordCount, passwordHash),
    );

    this.logger.log(
      `Sample data ready: ${result.enterpriseCount} enterprises and ${result.enterpriseUserCount} enterprise users.`,
    );
  }

  private getRecordCount(): number {
    const configured = Number.parseInt(
      this.configService.get<string>(
        'SEED_PAGINATION_RECORDS',
        String(DEFAULT_PAGINATION_RECORDS),
      ),
      10,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      throw new Error('SEED_PAGINATION_RECORDS must be a positive integer.');
    }
    return Math.min(configured, MAX_PAGINATION_RECORDS);
  }

  private async seed(
    manager: EntityManager,
    recordCount: number,
    passwordHash: string,
  ): Promise<{ enterpriseCount: number; enterpriseUserCount: number }> {
    await this.seedReferenceData(manager);
    await this.seedReportPeriods(manager);
    await this.seedInjuryFactors(manager);
    await this.seedInjuryTypes(manager);
    await this.seedOccupations(manager);

    const locations = await manager.query<LocationPair[]>(`
      SELECT DISTINCT ON (province.code)
        province.code AS province_code,
        ward.code AS ward_code
      FROM provinces province
      INNER JOIN wards ward ON ward.province_code = province.code
      WHERE province.is_active = TRUE
        AND ward.is_active = TRUE
      ORDER BY province.code, ward.code
    `);
    if (locations.length === 0) {
      throw new Error(
        'Location catalog is empty. Run database migrations before sample data seeding.',
      );
    }

    const enterprises = this.buildEnterprises(recordCount, locations);
    await manager.query(
      `
        INSERT INTO enterprises (
          enterprise_name,
          tax_code,
          business_type_id,
          industry_id,
          registration_date,
          province_id,
          ward_id,
          address,
          foreign_name,
          email,
          phone_number,
          op_province_id,
          op_ward_id,
          op_address,
          representative_name,
          representative_phone,
          is_active,
          files,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          seed.enterprise_name,
          seed.tax_code,
          business_type.id,
          industry.id,
          seed.registration_date::date,
          seed.province_code,
          seed.ward_code,
          seed.address,
          seed.foreign_name,
          seed.email,
          seed.phone_number,
          seed.province_code,
          seed.ward_code,
          seed.address,
          seed.representative_name,
          seed.representative_phone,
          seed.is_active,
          '{}'::jsonb,
          NULL,
          NULL,
          NOW() - (seed.sequence || ' hours')::interval,
          NOW() - (seed.sequence || ' hours')::interval
        FROM jsonb_to_recordset($1::jsonb) AS seed(
          sequence INT,
          tax_code VARCHAR(50),
          enterprise_name VARCHAR(255),
          foreign_name VARCHAR(255),
          business_type_code VARCHAR(50),
          industry_code VARCHAR(50),
          registration_date VARCHAR(10),
          province_code VARCHAR(20),
          ward_code VARCHAR(20),
          address VARCHAR(255),
          email VARCHAR(100),
          phone_number VARCHAR(20),
          representative_name VARCHAR(100),
          representative_phone VARCHAR(20),
          is_active BOOLEAN
        )
        INNER JOIN business_types business_type
          ON business_type.type_code = seed.business_type_code
        INNER JOIN industries industry
          ON industry.industry_code = seed.industry_code
        ON CONFLICT (tax_code) DO UPDATE
        SET enterprise_name = EXCLUDED.enterprise_name,
            business_type_id = EXCLUDED.business_type_id,
            industry_id = EXCLUDED.industry_id,
            registration_date = EXCLUDED.registration_date,
            province_id = EXCLUDED.province_id,
            ward_id = EXCLUDED.ward_id,
            address = EXCLUDED.address,
            foreign_name = EXCLUDED.foreign_name,
            email = EXCLUDED.email,
            phone_number = EXCLUDED.phone_number,
            op_province_id = EXCLUDED.op_province_id,
            op_ward_id = EXCLUDED.op_ward_id,
            op_address = EXCLUDED.op_address,
            representative_name = EXCLUDED.representative_name,
            representative_phone = EXCLUDED.representative_phone,
            is_active = EXCLUDED.is_active,
            deleted_at = NULL,
            updated_at = NOW()
      `,
      [JSON.stringify(this.toDatabaseRows(enterprises))],
    );

    const enterpriseRoleRows = await manager.query<Array<{ id: number }>>(`
      SELECT id
      FROM roles
      WHERE role_code = 'ENTERPRISE_USER'
        AND is_active = TRUE
        AND deleted_at IS NULL
      LIMIT 1
    `);
    const enterpriseRoleId = enterpriseRoleRows[0]?.id;
    if (!enterpriseRoleId) {
      throw new Error('Active ENTERPRISE_USER role is required for seeding.');
    }

    await manager.query(
      `
        INSERT INTO users (
          username,
          password_hash,
          full_name,
          dob,
          gender,
          email,
          phone_number,
          title,
          province_id,
          ward_id,
          address,
          role_id,
          enterprise_id,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          seed.tax_code,
          $2,
          seed.representative_name,
          (DATE '1982-01-01' + (seed.sequence * 137))::date,
          CASE WHEN seed.sequence % 2 = 0 THEN 1 ELSE 2 END,
          seed.email,
          seed.representative_phone,
          'Người đại diện pháp luật',
          seed.province_code,
          seed.ward_code,
          seed.address,
          $3,
          enterprise.id,
          seed.is_active,
          NULL,
          NULL,
          NOW() - (seed.sequence || ' hours')::interval,
          NOW() - (seed.sequence || ' hours')::interval
        FROM jsonb_to_recordset($1::jsonb) AS seed(
          sequence INT,
          tax_code VARCHAR(50),
          representative_name VARCHAR(100),
          email VARCHAR(100),
          representative_phone VARCHAR(20),
          province_code VARCHAR(20),
          ward_code VARCHAR(20),
          address VARCHAR(255),
          is_active BOOLEAN
        )
        INNER JOIN enterprises enterprise ON enterprise.tax_code = seed.tax_code
        ON CONFLICT (username) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            dob = EXCLUDED.dob,
            gender = EXCLUDED.gender,
            email = EXCLUDED.email,
            phone_number = EXCLUDED.phone_number,
            title = EXCLUDED.title,
            province_id = EXCLUDED.province_id,
            ward_id = EXCLUDED.ward_id,
            address = EXCLUDED.address,
            role_id = EXCLUDED.role_id,
            enterprise_id = EXCLUDED.enterprise_id,
            is_active = EXCLUDED.is_active,
            deleted_at = NULL,
            updated_at = NOW()
      `,
      [
        JSON.stringify(this.toDatabaseRows(enterprises)),
        passwordHash,
        enterpriseRoleId,
      ],
    );

    const taxCodes = enterprises.map(({ taxCode }) => taxCode);
    const [enterpriseCountRow] = await manager.query<Array<{ count: string }>>(
      'SELECT COUNT(*)::text AS count FROM enterprises WHERE tax_code = ANY($1::text[])',
      [taxCodes],
    );
    const [enterpriseUserCountRow] = await manager.query<
      Array<{ count: string }>
    >(
      `
        SELECT COUNT(*)::text AS count
        FROM users user_account
        INNER JOIN enterprises enterprise
          ON enterprise.id = user_account.enterprise_id
        WHERE enterprise.tax_code = ANY($1::text[])
      `,
      [taxCodes],
    );

    return {
      enterpriseCount: Number(enterpriseCountRow.count),
      enterpriseUserCount: Number(enterpriseUserCountRow.count),
    };
  }

  private async seedReferenceData(manager: EntityManager): Promise<void> {
    await manager.query(`
      INSERT INTO roles (role_code, role_name, is_active, deleted_at)
      VALUES
        ('ADMIN', 'Quản trị viên', TRUE, NULL),
        ('ENTERPRISE_USER', 'Người dùng doanh nghiệp', TRUE, NULL)
      ON CONFLICT (role_code) DO UPDATE
      SET role_name = EXCLUDED.role_name,
          is_active = TRUE,
          deleted_at = NULL
    `);

    await manager.query(
      `
        INSERT INTO business_types (type_code, type_name, is_active, deleted_at)
        SELECT type_code, type_name, TRUE, NULL
        FROM jsonb_to_recordset($1::jsonb)
          AS seed(type_code VARCHAR(50), type_name VARCHAR(255))
        ON CONFLICT (type_code) DO UPDATE
        SET type_name = EXCLUDED.type_name,
            is_active = TRUE,
            deleted_at = NULL
      `,
      [
        JSON.stringify(
          BUSINESS_TYPES.map(([typeCode, typeName]) => ({
            type_code: typeCode,
            type_name: typeName,
          })),
        ),
      ],
    );

    const industryRows = buildIndustrySeedRows();
    for (let level = 1; level <= 4; level += 1) {
      const rowsAtLevel = industryRows.filter((row) => row.level === level);
      await manager.query(
        `
          INSERT INTO industries (
            industry_code,
            industry_name,
            level,
            parent_id,
            is_active,
            deleted_at
          )
          SELECT
            seed.industry_code,
            seed.industry_name,
            seed.level,
            parent.id,
            seed.is_active,
            NULL
          FROM jsonb_to_recordset($1::jsonb)
            AS seed(
              industry_code VARCHAR(50),
              industry_name VARCHAR(255),
              parent_code VARCHAR(50),
              level INT,
              is_active BOOLEAN
            )
          LEFT JOIN industries AS parent
            ON parent.industry_code = seed.parent_code
            AND parent.deleted_at IS NULL
          ON CONFLICT (industry_code) DO UPDATE
          SET industry_name = EXCLUDED.industry_name,
              level = EXCLUDED.level,
              parent_id = EXCLUDED.parent_id,
              deleted_at = NULL
        `,
        [JSON.stringify(rowsAtLevel)],
      );
    }
  }

  private async seedReportPeriods(manager: EntityManager): Promise<void> {
    await manager.query(
      `
        INSERT INTO report_periods (
          report_name,
          report_year,
          report_period,
          start_date,
          end_date,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          report_name,
          report_year,
          report_period,
          start_date::date,
          end_date::date,
          is_active,
          NULL,
          NULL,
          NOW(),
          NOW()
        FROM jsonb_to_recordset($1::jsonb) AS seed(
          report_name VARCHAR(255),
          report_year SMALLINT,
          report_period VARCHAR(100),
          start_date VARCHAR(10),
          end_date VARCHAR(10),
          is_active BOOLEAN
        )
        ON CONFLICT DO NOTHING
      `,
      [
        JSON.stringify(
          REPORT_PERIODS.map((reportPeriod) => ({
            report_name: reportPeriod.reportName,
            report_year: reportPeriod.reportYear,
            report_period: reportPeriod.reportPeriod,
            start_date: reportPeriod.startDate,
            end_date: reportPeriod.endDate,
            is_active: reportPeriod.isActive,
          })),
        ),
      ],
    );
  }

  private async seedInjuryFactors(manager: EntityManager): Promise<void> {
    await manager.query(
      `
        INSERT INTO injury_factors (
          factor_code,
          factor_name,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT factor_code, factor_name, TRUE, NULL, NULL, NOW(), NOW()
        FROM jsonb_to_recordset($1::jsonb)
          AS seed(factor_code VARCHAR(50), factor_name VARCHAR(255))
        ON CONFLICT (factor_code) DO UPDATE
        SET factor_name = EXCLUDED.factor_name,
            is_active = TRUE,
            deleted_at = NULL,
            updated_at = NOW()
      `,
      [
        JSON.stringify(
          INJURY_FACTORS.map(([factorCode, factorName]) => ({
            factor_code: factorCode,
            factor_name: factorName,
          })),
        ),
      ],
    );
  }

  private async seedInjuryTypes(manager: EntityManager): Promise<void> {
    for (const level of [1, 2, 3] as const) {
      const rows = INJURY_TYPE_CATALOG.filter((row) => row.level === level);
      await manager.query(
        `
          INSERT INTO injury_types (
            injury_type_code,
            injury_type_name,
            level,
            parent_id,
            is_active,
            created_by,
            updated_by,
            created_at,
            updated_at
          )
          SELECT
            seed.injury_type_code,
            seed.injury_type_name,
            seed.level,
            parent.id,
            seed.is_active,
            NULL,
            NULL,
            NOW(),
            NOW()
          FROM jsonb_to_recordset($1::jsonb)
            AS seed(
              injury_type_code VARCHAR(3),
              injury_type_name VARCHAR(255),
              parent_code VARCHAR(3),
              level SMALLINT,
              is_active BOOLEAN
            )
          LEFT JOIN injury_types parent
            ON parent.injury_type_code = seed.parent_code
            AND parent.deleted_at IS NULL
          ON CONFLICT (injury_type_code) DO UPDATE
          SET injury_type_name = EXCLUDED.injury_type_name,
              level = EXCLUDED.level,
              parent_id = EXCLUDED.parent_id,
              is_active = EXCLUDED.is_active,
              deleted_at = NULL,
              updated_at = NOW()
        `,
        [
          JSON.stringify(
            rows.map((row) => ({
              injury_type_code: row.injuryTypeCode,
              injury_type_name: row.injuryTypeName,
              parent_code: row.parentCode,
              level: row.level,
              is_active: row.isActive,
            })),
          ),
        ],
      );
    }
  }

  private async seedOccupations(manager: EntityManager): Promise<void> {
    for (const level of [1, 2, 3, 4] as const) {
      const rows = OCCUPATION_CATALOG.filter((row) => row.level === level);
      await manager.query(
        `
          INSERT INTO occupations (
            occupation_code,
            occupation_name,
            level,
            parent_id,
            is_active,
            created_by,
            updated_by,
            created_at,
            updated_at
          )
          SELECT
            seed.occupation_code,
            seed.occupation_name,
            seed.level,
            parent.id,
            seed.is_active,
            NULL,
            NULL,
            NOW(),
            NOW()
          FROM jsonb_to_recordset($1::jsonb)
            AS seed(
              occupation_code VARCHAR(4),
              occupation_name VARCHAR(255),
              parent_code VARCHAR(4),
              level SMALLINT,
              is_active BOOLEAN
            )
          LEFT JOIN occupations parent
            ON parent.occupation_code = seed.parent_code
            AND parent.deleted_at IS NULL
          ON CONFLICT (occupation_code) DO UPDATE
          SET occupation_name = EXCLUDED.occupation_name,
              level = EXCLUDED.level,
              parent_id = EXCLUDED.parent_id,
              is_active = EXCLUDED.is_active,
              deleted_at = NULL,
              updated_at = NOW()
        `,
        [
          JSON.stringify(
            rows.map((row) => ({
              occupation_code: row.occupationCode,
              occupation_name: row.occupationName,
              parent_code: row.parentCode,
              level: row.level,
              is_active: row.isActive,
            })),
          ),
        ],
      );
    }
  }

  private buildEnterprises(
    count: number,
    locations: LocationPair[],
  ): EnterpriseSeedRow[] {
    return Array.from({ length: count }, (_, index) => {
      const sequence = index + 1;
      const displayNumber = String(sequence).padStart(2, '0');
      const location = locations[index % locations.length];
      const profile = COMPANY_PROFILES[index % COMPANY_PROFILES.length];
      const profileBatch = Math.floor(index / COMPANY_PROFILES.length) + 1;
      const profileSuffix = profileBatch === 1 ? '' : ` ${profileBatch}`;
      const representative =
        REPRESENTATIVE_NAMES[index % REPRESENTATIVE_NAMES.length];

      return {
        sequence,
        taxCode: `099${String(sequence).padStart(7, '0')}`,
        enterpriseName: `${profile.enterpriseName}${profileSuffix}`,
        foreignName: `${profile.foreignName}${profileSuffix}`,
        businessTypeCode: profile.businessTypeCode,
        industryCode: profile.industryCode,
        registrationDate: `${2018 + (index % 8)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
        provinceCode: location.province_code,
        wardCode: location.ward_code,
        address: `${sequence * 3 + 12} ${STREET_NAMES[index % STREET_NAMES.length]}`,
        email: `doanhnghiep${displayNumber}@example.com`,
        phoneNumber: `02873${String(sequence).padStart(5, '0')}`,
        representativeName: representative,
        representativePhone: `090${String(sequence).padStart(7, '0')}`,
        isActive: sequence % 5 !== 0,
      };
    });
  }

  private toDatabaseRows(
    enterprises: EnterpriseSeedRow[],
  ): Array<Record<string, string | number | boolean>> {
    return enterprises.map((enterprise) => ({
      sequence: enterprise.sequence,
      tax_code: enterprise.taxCode,
      enterprise_name: enterprise.enterpriseName,
      foreign_name: enterprise.foreignName,
      business_type_code: enterprise.businessTypeCode,
      industry_code: enterprise.industryCode,
      registration_date: enterprise.registrationDate,
      province_code: enterprise.provinceCode,
      ward_code: enterprise.wardCode,
      address: enterprise.address,
      email: enterprise.email,
      phone_number: enterprise.phoneNumber,
      representative_name: enterprise.representativeName,
      representative_phone: enterprise.representativePhone,
      is_active: enterprise.isActive,
    }));
  }
}
