// src/Components/BusinessRegister/options.ts
import type { BusinessFiles, BusinessInfo } from '@/services/business';
import type { Industry } from '@/services/enterprise';

export type Option = { value: string; label: string };

export type CatalogOptions = { businessTypes: Option[]; industries: Option[]; industryTree?: Industry[] };

export const labelOf = (options: Option[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value;

// Tỉnh/Thành phố ĐKKD cố định theo phạm vi triển khai hiện tại.
export const HCM_PROVINCE_CODE = '79';

// Form trống dùng chung cho Đăng ký doanh nghiệp và trang Thêm doanh nghiệp của Quản trị viên
export const EMPTY_BUSINESS_INFO: BusinessInfo = {
  companyName: '', taxCode: '', businessType: '', mainIndustry: '', licenseDate: '', province: HCM_PROVINCE_CODE, ward: '', address: '',
  foreignName: '', email: '', officePhone: '', leaderName: '', leaderPhone: '',
  operatingProvince: '', operatingWard: '', businessLocation: '',
};
export const EMPTY_BUSINESS_FILES: BusinessFiles = { businessLicense: null, otherDocument: null };
