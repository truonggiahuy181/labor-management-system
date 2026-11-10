import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { DataSource, EntityManager } from 'typeorm';
import type { BusinessTypeCode } from '../catalogs/business-type-catalog.js';
import { getStoredIndustryCode } from '../catalogs/industry-catalog.js';
import { INJURY_TYPE_CATALOG } from '../catalogs/injury-type-catalog.js';
import { bootstrapAdmin, type AdminBootstrapInput } from './admin-bootstrap.js';
import { seedReferenceData } from './reference-data-seed.js';
import {
  ReportPeriodCode,
  ReportTypeCode,
} from '../../modules/report-period/report-period.constants.js';
import {
  DEMO_REPORT_DOCUMENT_BUFFER,
  DEMO_REPORT_DOCUMENT_CONTENT_TYPE,
  DEMO_REPORT_DOCUMENT_OBJECT_KEY,
  DEMO_REPORT_DOCUMENT_ORIGINAL_NAME,
  DEMO_REPORT_DOCUMENT_SHA256,
} from '../../modules/file/demo-report-document.js';

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
  businessTypeCode: BusinessTypeCode;
  industryCode: string;
}

interface DemoReportPeriodRow {
  report_name: string;
  report_type_code: string;
  report_year: number;
  period_code: string;
  submission_start_date: string;
  submission_end_date: string;
  is_active: boolean;
}

interface DemoReportSeedRow {
  tax_code: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'RETURNED';
  total_employees: number;
  female_employees: number;
  payroll_fund_vnd: string;
  no_accidents_declared: boolean;
  returned_reason: string | null;
}

interface DemoReportHistorySeedRow {
  tax_code: string;
  from_status: DemoReportSeedRow['status'] | null;
  to_status: DemoReportSeedRow['status'];
  reason: string | null;
  actor: 'ADMIN' | 'ENTERPRISE';
  age_days: number;
}

const DEFAULT_PAGINATION_RECORDS = 30;
const MAX_PAGINATION_RECORDS = 100;
const DEFAULT_ENTERPRISE_PASSWORD = '12345678';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123456';

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
    industryCode: '6219',
  },
  {
    enterpriseName: 'Công ty Cổ phần Giải pháp Số Đông Dương',
    foreignName: 'Indochina Digital Solutions Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '6220',
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
    industryCode: '3101',
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
    industryCode: '2619',
  },
  {
    enterpriseName: 'Công ty TNHH Một Thành Viên Nội thất Mộc Việt',
    foreignName: 'Moc Viet Furniture One Member Company Limited',
    businessTypeCode: 'TNHH1',
    industryCode: '3101',
  },
  {
    enterpriseName: 'Công ty Cổ phần Phần mềm Tiên Phong',
    foreignName: 'Tien Phong Software Joint Stock Company',
    businessTypeCode: 'CTCP',
    industryCode: '6219',
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
    startDate: '2025-07-01',
    endDate: '2025-07-04',
    isActive: false,
  },
  {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2025,
    reportPeriod: 'Cả năm',
    startDate: '2026-01-01',
    endDate: '2026-01-09',
    isActive: false,
  },
  {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2026,
    reportPeriod: '6 tháng đầu năm',
    startDate: '2026-07-01',
    endDate: '2026-07-04',
    isActive: true,
  },
  {
    reportName: 'Báo cáo tai nạn lao động',
    reportYear: 2026,
    reportPeriod: 'Cả năm',
    startDate: '2027-01-01',
    endDate: '2027-01-09',
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

const ACCIDENT_CAUSES = [
  [
    'NSDL-01',
    'Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn',
    'EMPLOYER',
  ],
  [
    'NSDL-02',
    'Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt',
    'EMPLOYER',
  ],
  ['NSDL-03', 'Tổ chức lao động không hợp lý', 'EMPLOYER'],
  [
    'NLD-01',
    'Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ',
    'EMPLOYER',
  ],
  [
    'NLD-02',
    'Không có quy trình an toàn hoặc biện pháp làm việc an toàn',
    'EMPLOYER',
  ],
  ['NLD-03', 'Điều kiện làm việc không tốt', 'EMPLOYER'],
  [
    'KQ-01',
    'Quy phạm, nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn',
    'EMPLOYEE',
  ],
  ['KQ-02', 'Không sử dụng phương tiện bảo vệ cá nhân', 'EMPLOYEE'],
  ['KQ-03', 'Khách quan khó tránh hoặc nguyên nhân chưa kể đến', 'EMPLOYEE'],
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

    const admin = this.getAdminInput();

    const passwordHash = await argon2.hash(password);
    const result = await this.dataSource.transaction((manager) =>
      this.seed(manager, recordCount, passwordHash, admin),
    );

    this.logger.log(
      `Demo data ready: ${result.enterpriseCount} enterprises, ${result.enterpriseUserCount} enterprise users, ${result.reportCount} accident reports and admin '${result.adminUsername}'.`,
    );
  }

  private getAdminInput(): AdminBootstrapInput {
    const password = this.configService.get<string>(
      'SEED_ADMIN_PASSWORD',
      DEFAULT_ADMIN_PASSWORD,
    );
    if (password.length < 12) {
      throw new Error(
        'SEED_ADMIN_PASSWORD must contain at least 12 characters.',
      );
    }

    return {
      username: this.configService
        .get<string>('SEED_ADMIN_USERNAME', 'admin_demo')
        .trim(),
      password,
      email: this.configService
        .get<string>('SEED_ADMIN_EMAIL', 'admin.demo@example.com')
        .trim()
        .toLowerCase(),
      fullName: 'Quản trị viên demo',
    };
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
    admin: AdminBootstrapInput,
  ): Promise<{
    enterpriseCount: number;
    enterpriseUserCount: number;
    reportCount: number;
    adminUsername: string;
  }> {
    await seedReferenceData(manager);
    await this.seedReportPeriods(manager);
    await this.seedInjuryFactors(manager);
    await this.seedInjuryTypes(manager);
    await this.seedAccidentCauses(manager);

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

    const adminResult = await bootstrapAdmin(manager, admin);
    const reportCount = await this.seedDemoReports(manager);

    return {
      enterpriseCount: Number(enterpriseCountRow.count),
      enterpriseUserCount: Number(enterpriseUserCountRow.count),
      reportCount,
      adminUsername: adminResult.username,
    };
  }

  private async seedReportPeriods(manager: EntityManager): Promise<void> {
    const rows = this.buildReportPeriods(new Date());
    await manager.query(
      `
        INSERT INTO report_periods (
          report_name,
          report_type_code,
          report_year,
          period_code,
          submission_start_date,
          submission_end_date,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          report_name,
          report_type_code,
          report_year,
          period_code,
          submission_start_date::date,
          submission_end_date::date,
          is_active,
          NULL,
          NULL,
          NOW(),
          NOW()
        FROM jsonb_to_recordset($1::jsonb) AS seed(
          report_name VARCHAR(255),
          report_type_code VARCHAR(50),
          report_year SMALLINT,
          period_code VARCHAR(30),
          submission_start_date VARCHAR(10),
          submission_end_date VARCHAR(10),
          is_active BOOLEAN
        )
        ON CONFLICT (report_type_code, report_year, period_code) DO UPDATE
        SET report_name = EXCLUDED.report_name,
            submission_start_date = EXCLUDED.submission_start_date,
            submission_end_date = EXCLUDED.submission_end_date,
            is_active = EXCLUDED.is_active,
            deleted_at = NULL,
            updated_at = NOW()
      `,
      [JSON.stringify(rows)],
    );
  }

  private buildReportPeriods(now: Date): DemoReportPeriodRow[] {
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    const today = this.toDateOnly(now);
    const demoWindowStart = this.toDateOnly(this.addDays(now, -30));
    const demoWindowEnd = this.toDateOnly(this.addDays(now, 30));
    const occupationalReportName = REPORT_PERIODS[0].reportName;

    return [
      {
        report_name: occupationalReportName,
        report_type_code: ReportTypeCode.OCCUPATIONAL_ACCIDENT,
        report_year: previousYear,
        period_code: ReportPeriodCode.FIRST_HALF,
        submission_start_date: `${previousYear}-07-01`,
        submission_end_date: `${previousYear}-07-04`,
        is_active: false,
      },
      {
        report_name: occupationalReportName,
        report_type_code: ReportTypeCode.OCCUPATIONAL_ACCIDENT,
        report_year: previousYear,
        period_code: ReportPeriodCode.ANNUAL,
        submission_start_date: `${currentYear}-01-01`,
        submission_end_date: `${currentYear}-01-09`,
        is_active: false,
      },
      {
        report_name: occupationalReportName,
        report_type_code: ReportTypeCode.OCCUPATIONAL_ACCIDENT,
        report_year: currentYear,
        period_code: ReportPeriodCode.FIRST_HALF,
        submission_start_date: `${currentYear}-07-01`,
        submission_end_date: `${currentYear}-07-04`,
        is_active: true,
      },
      {
        report_name: `${occupationalReportName} (demo local)`,
        report_type_code: ReportTypeCode.OCCUPATIONAL_ACCIDENT,
        report_year: currentYear,
        period_code: ReportPeriodCode.ANNUAL,
        submission_start_date: demoWindowStart,
        submission_end_date: demoWindowEnd,
        is_active: true,
      },
      {
        report_name: `${REPORT_PERIODS[4].reportName} (demo ${today})`,
        report_type_code: ReportTypeCode.OTHER,
        report_year: currentYear,
        period_code: ReportPeriodCode.CUSTOM,
        submission_start_date: `${currentYear}-01-01`,
        submission_end_date: `${currentYear}-12-31`,
        is_active: true,
      },
    ];
  }

  private addDays(value: Date, days: number): Date {
    const result = new Date(value);
    result.setDate(result.getDate() + days);
    return result;
  }

  private toDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  private async seedAccidentCauses(manager: EntityManager): Promise<void> {
    await manager.query(
      `
        INSERT INTO accident_causes (
          cause_code,
          cause_name,
          cause_group,
          display_order,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          cause_code,
          cause_name,
          cause_group,
          display_order,
          TRUE,
          NULL,
          NULL,
          NOW(),
          NOW()
        FROM jsonb_to_recordset($1::jsonb) AS seed(
          cause_code VARCHAR(20),
          cause_name VARCHAR(255),
          cause_group VARCHAR(20),
          display_order SMALLINT
        )
        ON CONFLICT (cause_code) DO UPDATE
        SET cause_name = EXCLUDED.cause_name,
            cause_group = EXCLUDED.cause_group,
            display_order = EXCLUDED.display_order,
            is_active = TRUE,
            deleted_at = NULL,
            updated_at = NOW()
      `,
      [
        JSON.stringify(
          ACCIDENT_CAUSES.map(([causeCode, causeName, causeGroup], index) => ({
            cause_code: causeCode,
            cause_name: causeName,
            cause_group: causeGroup,
            display_order: index + 1,
          })),
        ),
      ],
    );
  }

  private async seedDemoReports(manager: EntityManager): Promise<number> {
    const currentYear = new Date().getFullYear();
    const reports: DemoReportSeedRow[] = [
      {
        tax_code: '0990000001',
        status: 'DRAFT',
        total_employees: 86,
        female_employees: 39,
        payroll_fund_vnd: '12400000000',
        no_accidents_declared: false,
        returned_reason: null,
      },
      {
        tax_code: '0990000002',
        status: 'DRAFT',
        total_employees: 142,
        female_employees: 61,
        payroll_fund_vnd: '21800000000',
        no_accidents_declared: false,
        returned_reason: null,
      },
      {
        tax_code: '0990000003',
        status: 'SUBMITTED',
        total_employees: 234,
        female_employees: 128,
        payroll_fund_vnd: '35600000000',
        no_accidents_declared: false,
        returned_reason: null,
      },
      {
        tax_code: '0990000004',
        status: 'RECEIVED',
        total_employees: 65,
        female_employees: 27,
        payroll_fund_vnd: '9300000000',
        no_accidents_declared: true,
        returned_reason: null,
      },
      {
        tax_code: '0990000006',
        status: 'RETURNED',
        total_employees: 318,
        female_employees: 174,
        payroll_fund_vnd: '48700000000',
        no_accidents_declared: false,
        returned_reason:
          'Vui lòng kiểm tra lại số liệu nạn nhân và bổ sung thông tin chi phí.',
      },
      {
        tax_code: '0990000007',
        status: 'DRAFT',
        total_employees: 48,
        female_employees: 19,
        payroll_fund_vnd: '6800000000',
        no_accidents_declared: true,
        returned_reason: null,
      },
    ];

    await manager.query(
      `
        INSERT INTO occupational_accident_reports (
          enterprise_id,
          report_period_id,
          status,
          enterprise_name,
          tax_code,
          enterprise_address,
          business_type_code,
          business_type_name,
          industry_code,
          industry_name,
          administrative_unit_code,
          administrative_unit_name,
          administrative_unit_level,
          recipient_agency_name,
          total_employees,
          female_employees,
          payroll_fund_vnd,
          no_accidents_declared,
          submitted_at,
          received_at,
          returned_at,
          returned_reason,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          enterprise.id,
          period.id,
          seed.status,
          enterprise.enterprise_name,
          enterprise.tax_code,
          enterprise.address,
          business_type.type_code,
          business_type.type_name,
          industry.industry_code,
          industry.industry_name,
          province.code,
          province.name,
          'PROVINCE',
          'Sở Nội vụ',
          seed.total_employees,
          seed.female_employees,
          seed.payroll_fund_vnd::bigint,
          seed.no_accidents_declared,
          CASE WHEN seed.status IN ('SUBMITTED', 'RECEIVED', 'RETURNED')
            THEN NOW() - INTERVAL '3 days' ELSE NULL END,
          CASE WHEN seed.status = 'RECEIVED'
            THEN NOW() - INTERVAL '2 days' ELSE NULL END,
          CASE WHEN seed.status = 'RETURNED'
            THEN NOW() - INTERVAL '2 days' ELSE NULL END,
          seed.returned_reason,
          enterprise_user.id,
          enterprise_user.id,
          NOW() - INTERVAL '10 days',
          NOW() - INTERVAL '1 day'
        FROM jsonb_to_recordset($1::jsonb) AS seed(
          tax_code VARCHAR(50),
          status VARCHAR(20),
          total_employees INT,
          female_employees INT,
          payroll_fund_vnd VARCHAR(30),
          no_accidents_declared BOOLEAN,
          returned_reason VARCHAR(1000)
        )
        INNER JOIN enterprises enterprise ON enterprise.tax_code = seed.tax_code
        INNER JOIN users enterprise_user
          ON enterprise_user.enterprise_id = enterprise.id
        INNER JOIN business_types business_type
          ON business_type.id = enterprise.business_type_id
        INNER JOIN industries industry ON industry.id = enterprise.industry_id
        INNER JOIN provinces province ON province.code = enterprise.province_id
        INNER JOIN report_periods period
          ON period.report_type_code = $2
          AND period.report_year = $3
          AND period.period_code = $4
        ON CONFLICT (enterprise_id, report_period_id) DO NOTHING
      `,
      [
        JSON.stringify(reports),
        ReportTypeCode.OCCUPATIONAL_ACCIDENT,
        currentYear,
        ReportPeriodCode.ANNUAL,
      ],
    );

    await manager.query(
      `
        WITH target AS (
          SELECT
            report.id AS report_id,
            report.created_by AS user_id,
            seed.tax_code,
            seed.accident_date,
            seed.cause_code,
            seed.factor_code,
            seed.medical_cost_vnd,
            seed.salary_cost_vnd,
            seed.compensation_cost_vnd,
            seed.lost_work_days,
            seed.property_damage_vnd
          FROM jsonb_to_recordset($1::jsonb) AS seed(
            tax_code VARCHAR(50),
            accident_date VARCHAR(10),
            cause_code VARCHAR(20),
            factor_code VARCHAR(50),
            medical_cost_vnd VARCHAR(30),
            salary_cost_vnd VARCHAR(30),
            compensation_cost_vnd VARCHAR(30),
            lost_work_days INT,
            property_damage_vnd VARCHAR(30)
          )
          INNER JOIN occupational_accident_reports report
            ON report.tax_code = seed.tax_code
          INNER JOIN report_periods period
            ON period.id = report.report_period_id
            AND period.report_year = $2
            AND period.period_code = $3
        )
        INSERT INTO occupational_accident_cases (
          report_id,
          accident_date,
          primary_cause_id,
          injury_factor_id,
          medical_cost_vnd,
          salary_cost_vnd,
          compensation_cost_vnd,
          lost_work_days,
          property_damage_vnd,
          created_by,
          updated_by
        )
        SELECT
          target.report_id,
          target.accident_date::date,
          cause.id,
          factor.id,
          target.medical_cost_vnd::bigint,
          target.salary_cost_vnd::bigint,
          target.compensation_cost_vnd::bigint,
          target.lost_work_days,
          target.property_damage_vnd::bigint,
          target.user_id,
          target.user_id
        FROM target
        INNER JOIN accident_causes cause
          ON cause.cause_code = target.cause_code
        INNER JOIN injury_factors factor
          ON factor.factor_code = target.factor_code
        WHERE NOT EXISTS (
          SELECT 1
          FROM occupational_accident_cases existing
          WHERE existing.report_id = target.report_id
            AND existing.deleted_at IS NULL
        )
      `,
      [
        JSON.stringify([
          {
            tax_code: '0990000002',
            accident_date: `${currentYear}-03-14`,
            cause_code: 'NLD-01',
            factor_code: 'Mã 4',
            medical_cost_vnd: '18000000',
            salary_cost_vnd: '9000000',
            compensation_cost_vnd: '25000000',
            lost_work_days: 21,
            property_damage_vnd: '12000000',
          },
          {
            tax_code: '0990000003',
            accident_date: `${currentYear}-04-22`,
            cause_code: 'NSDL-02',
            factor_code: 'Mã 5',
            medical_cost_vnd: '32000000',
            salary_cost_vnd: '15000000',
            compensation_cost_vnd: '48000000',
            lost_work_days: 37,
            property_damage_vnd: '85000000',
          },
          {
            tax_code: '0990000006',
            accident_date: `${currentYear}-05-09`,
            cause_code: 'NLD-02',
            factor_code: 'Mã 7',
            medical_cost_vnd: '24000000',
            salary_cost_vnd: '11000000',
            compensation_cost_vnd: '36000000',
            lost_work_days: 29,
            property_damage_vnd: '7000000',
          },
        ]),
        currentYear,
        ReportPeriodCode.ANNUAL,
      ],
    );

    await manager.query(
      `
        INSERT INTO occupational_accident_victim_groups (
          accident_case_id,
          occupation_id,
          is_under_enterprise_management,
          victim_count,
          female_count,
          death_count,
          severe_count,
          created_by,
          updated_by
        )
        SELECT
          accident_case.id,
          occupation.id,
          TRUE,
          CASE WHEN report.tax_code = '0990000003' THEN 2 ELSE 1 END,
          CASE WHEN report.tax_code = '0990000006' THEN 1 ELSE 0 END,
          CASE WHEN report.tax_code = '0990000003' THEN 1 ELSE 0 END,
          CASE WHEN report.tax_code = '0990000003' THEN 1 ELSE 1 END,
          report.created_by,
          report.created_by
        FROM occupational_accident_reports report
        INNER JOIN report_periods period
          ON period.id = report.report_period_id
          AND period.report_year = $1
          AND period.period_code = $2
        INNER JOIN occupational_accident_cases accident_case
          ON accident_case.report_id = report.id
          AND accident_case.deleted_at IS NULL
        INNER JOIN occupations occupation
          ON occupation.occupation_code = '1111'
        WHERE report.tax_code = ANY($3::text[])
        ON CONFLICT (
          accident_case_id,
          occupation_id,
          is_under_enterprise_management
        ) DO NOTHING
      `,
      [
        currentYear,
        ReportPeriodCode.ANNUAL,
        ['0990000002', '0990000003', '0990000006'],
      ],
    );

    await manager.query(
      `
        INSERT INTO occupational_accident_article39_summaries (
          report_id,
          total_cases,
          fatal_cases,
          multi_victim_cases,
          victim_count,
          female_count,
          death_count,
          severe_count,
          unmanaged_victim_count,
          unmanaged_female_count,
          unmanaged_death_count,
          unmanaged_severe_count,
          medical_cost_vnd,
          salary_cost_vnd,
          compensation_cost_vnd,
          lost_work_days,
          property_damage_vnd,
          created_by,
          updated_by
        )
        SELECT
          report.id,
          1,
          0,
          0,
          1,
          CASE WHEN report.tax_code = '0990000006' THEN 1 ELSE 0 END,
          0,
          1,
          0,
          0,
          0,
          0,
          6000000,
          3000000,
          8000000,
          8,
          2000000,
          report.created_by,
          report.created_by
        FROM occupational_accident_reports report
        INNER JOIN report_periods period
          ON period.id = report.report_period_id
          AND period.report_year = $1
          AND period.period_code = $2
        WHERE report.tax_code = ANY($3::text[])
        ON CONFLICT (report_id) DO NOTHING
      `,
      [currentYear, ReportPeriodCode.ANNUAL, ['0990000003', '0990000006']],
    );

    await manager.query(
      `
        INSERT INTO occupational_accident_report_submissions (
          report_id,
          submission_no,
          report_date,
          submitted_by,
          submitted_at,
          payload_snapshot,
          document_object_key,
          document_original_name,
          document_content_type,
          document_size,
          document_sha256
        )
        SELECT
          report.id,
          1,
          CURRENT_DATE,
          enterprise_user.id,
          COALESCE(report.submitted_at, NOW() - INTERVAL '3 days'),
          jsonb_build_object(
            'schemaVersion', 1,
            'seededDemo', TRUE,
            'status', 'SUBMITTED',
            'taxCode', report.tax_code
          ),
          $4,
          $5,
          $6,
          $7,
          $8
        FROM occupational_accident_reports report
        INNER JOIN report_periods period
          ON period.id = report.report_period_id
          AND period.report_year = $1
          AND period.period_code = $2
        INNER JOIN users enterprise_user
          ON enterprise_user.enterprise_id = report.enterprise_id
        WHERE report.tax_code = ANY($3::text[])
        ON CONFLICT (report_id, submission_no) DO NOTHING
      `,
      [
        currentYear,
        ReportPeriodCode.ANNUAL,
        ['0990000003', '0990000004', '0990000006'],
        DEMO_REPORT_DOCUMENT_OBJECT_KEY,
        DEMO_REPORT_DOCUMENT_ORIGINAL_NAME,
        DEMO_REPORT_DOCUMENT_CONTENT_TYPE,
        DEMO_REPORT_DOCUMENT_BUFFER.length,
        DEMO_REPORT_DOCUMENT_SHA256,
      ],
    );

    await manager.query(
      `
        INSERT INTO occupational_accident_report_draft_documents (
          report_id,
          document_object_key,
          document_original_name,
          document_content_type,
          document_size,
          document_sha256,
          uploaded_by,
          uploaded_at
        )
        SELECT
          report.id,
          $4,
          $5,
          $6,
          $7,
          $8,
          enterprise_user.id,
          NOW() - INTERVAL '1 day'
        FROM occupational_accident_reports report
        INNER JOIN report_periods period
          ON period.id = report.report_period_id
          AND period.report_year = $1
          AND period.period_code = $2
        INNER JOIN users enterprise_user
          ON enterprise_user.enterprise_id = report.enterprise_id
        WHERE report.tax_code = ANY($3::text[])
          AND report.status IN ('DRAFT', 'RETURNED')
        ON CONFLICT (report_id) DO NOTHING
      `,
      [
        currentYear,
        ReportPeriodCode.ANNUAL,
        ['0990000002', '0990000006'],
        DEMO_REPORT_DOCUMENT_OBJECT_KEY,
        DEMO_REPORT_DOCUMENT_ORIGINAL_NAME,
        DEMO_REPORT_DOCUMENT_CONTENT_TYPE,
        DEMO_REPORT_DOCUMENT_BUFFER.length,
        DEMO_REPORT_DOCUMENT_SHA256,
      ],
    );

    await manager.query(
      `
        INSERT INTO occupational_accident_report_histories (
          report_id,
          submission_id,
          from_status,
          to_status,
          reason,
          created_by,
          created_at
        )
        SELECT
          report.id,
          CASE WHEN seed.to_status = 'DRAFT' THEN NULL ELSE submission.id END,
          seed.from_status,
          seed.to_status,
          seed.reason,
          CASE WHEN seed.actor = 'ADMIN'
            THEN admin_user.id ELSE enterprise_user.id END,
          NOW() - (seed.age_days || ' days')::interval
        FROM jsonb_to_recordset($1::jsonb) AS seed(
          tax_code VARCHAR(50),
          from_status VARCHAR(20),
          to_status VARCHAR(20),
          reason VARCHAR(1000),
          actor VARCHAR(20),
          age_days INT
        )
        INNER JOIN occupational_accident_reports report
          ON report.tax_code = seed.tax_code
        INNER JOIN report_periods period
          ON period.id = report.report_period_id
          AND period.report_year = $2
          AND period.period_code = $3
        INNER JOIN users enterprise_user
          ON enterprise_user.enterprise_id = report.enterprise_id
        LEFT JOIN users admin_user ON admin_user.username = $4
        LEFT JOIN occupational_accident_report_submissions submission
          ON submission.report_id = report.id
          AND submission.submission_no = 1
        WHERE NOT EXISTS (
          SELECT 1
          FROM occupational_accident_report_histories existing
          WHERE existing.report_id = report.id
            AND existing.from_status IS NOT DISTINCT FROM seed.from_status
            AND existing.to_status = seed.to_status
            AND existing.reason IS NOT DISTINCT FROM seed.reason
        )
      `,
      [
        JSON.stringify(this.buildDemoReportHistories(reports)),
        currentYear,
        ReportPeriodCode.ANNUAL,
        this.configService
          .get<string>('SEED_ADMIN_USERNAME', 'admin_demo')
          .trim(),
      ],
    );

    const [countRow] = await manager.query<Array<{ count: string }>>(
      `
        SELECT COUNT(*)::text AS count
        FROM occupational_accident_reports report
        INNER JOIN report_periods period ON period.id = report.report_period_id
        WHERE report.tax_code = ANY($1::text[])
          AND period.report_year = $2
          AND period.period_code = $3
      `,
      [
        reports.map((report) => report.tax_code),
        currentYear,
        ReportPeriodCode.ANNUAL,
      ],
    );
    return Number(countRow.count);
  }

  private buildDemoReportHistories(
    reports: DemoReportSeedRow[],
  ): DemoReportHistorySeedRow[] {
    return reports.flatMap((report) => {
      const rows: DemoReportHistorySeedRow[] = [
        {
          tax_code: report.tax_code,
          from_status: null,
          to_status: 'DRAFT',
          reason: null,
          actor: 'ENTERPRISE',
          age_days: 10,
        },
      ];
      if (report.status === 'DRAFT') return rows;

      rows.push({
        tax_code: report.tax_code,
        from_status: 'DRAFT',
        to_status: 'SUBMITTED',
        reason: null,
        actor: 'ENTERPRISE',
        age_days: 3,
      });
      if (report.status === 'RECEIVED') {
        rows.push({
          tax_code: report.tax_code,
          from_status: 'SUBMITTED',
          to_status: 'RECEIVED',
          reason: null,
          actor: 'ADMIN',
          age_days: 2,
        });
      }
      if (report.status === 'RETURNED') {
        rows.push({
          tax_code: report.tax_code,
          from_status: 'SUBMITTED',
          to_status: 'RETURNED',
          reason: report.returned_reason,
          actor: 'ADMIN',
          age_days: 2,
        });
      }
      return rows;
    });
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
        industryCode: getStoredIndustryCode(profile.industryCode),
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
