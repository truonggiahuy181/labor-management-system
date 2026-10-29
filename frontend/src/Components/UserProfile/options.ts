// src/Components/UserProfile/options.ts
// Danh sách chọn dùng chung cho trang Thông tin tài khoản và Chi tiết người dùng
export type Option = { value: string; label: string };

// label là key dịch, khi render mới gọi translate
export const GENDERS: Option[] = [
  { value: '1', label: 'account.genderMale' },
  { value: '0', label: 'account.genderFemale' },
  { value: '2', label: 'account.genderOther' },
];

// Tỉnh/thành → phường/xã (đơn vị hành chính 2 cấp: HCM 3 phường, HN 2 phường giống form trong quản lý)
export const PROVINCES: (Option & { wards: Option[] })[] = [
  {
    value: 'HCM',
    label: 'Thành phố Hồ Chí Minh',
    wards: [
      { value: 'HIEP_BINH', label: 'Phường Hiệp Bình' },
      { value: 'TAN_DINH', label: 'Phường Tân Định' },
      { value: 'SAI_GON', label: 'Phường Sài Gòn' },
    ],
  },
  {
    value: 'HN',
    label: 'Thành phố Hà Nội',
    wards: [
      { value: 'HOAN_KIEM', label: 'Phường Hoàn Kiếm' },
      { value: 'BA_DINH', label: 'Phường Ba Đình' },
    ],
  },
];

export const wardsOf = (province?: string | null) =>
  PROVINCES.find((p) => p.value === province || (province === '79' && p.value === 'HCM') || (province === '01' && p.value === 'HN'))?.wards ?? [];

// Giữ lại WARDS để tương thích ngược nếu có import
export const WARDS: Option[] = [];

// Khung bo góc theo thiết kế
export const PROFILE_CARD_SX = { borderRadius: 2 };