// src/Components/BusinessRegister/options.ts
// Danh mục mẫu cho các ô chọn. TODO: thay bằng API danh mục (loại hình, ngành nghề VSIC, tỉnh/xã).

export type Option = { value: string; label: string };

export const BUSINESS_TYPES: Option[] = [
  { value: 'TNHH1', label: 'Công ty TNHH 1 thành viên' },
  { value: 'TNHH2', label: 'Công ty TNHH 2 thành viên trở lên' },
  { value: 'CP', label: 'Công ty cổ phần' },
  { value: 'HD', label: 'Công ty hợp danh' },
  { value: 'DNTN', label: 'Doanh nghiệp tư nhân' },
];

export const INDUSTRIES: Option[] = [
  { value: '4669', label: '4669 - Bán buôn chuyên doanh khác chưa được phân vào đâu' },
  { value: '4100', label: '4100 - Xây dựng nhà các loại' },
  { value: '1410', label: '1410 - May trang phục (trừ trang phục từ da lông thú)' },
  { value: '6201', label: '6201 - Lập trình máy vi tính' },
];

// Danh mục loại hình / ngành nghề truyền vào form: luồng đăng ký dùng mặc định,
// Quản trị viên truyền danh mục thật từ API (Hooks/useCatalogs)
export type CatalogOptions = { businessTypes: Option[]; industries: Option[] };
export const DEFAULT_CATALOG: CatalogOptions = { businessTypes: BUSINESS_TYPES, industries: INDUSTRIES };

export const labelOf = (options: Option[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value;
