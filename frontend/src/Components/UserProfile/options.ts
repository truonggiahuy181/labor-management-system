// src/Components/UserProfile/options.ts
// Danh sách chọn dùng chung cho trang Thông tin tài khoản và Chi tiết người dùng
export type Option = { value: string; label: string };

// label là key dịch, khi render mới gọi translate
export const GENDERS: Option[] = [
  { value: '1', label: 'account.genderMale' },
  { value: '0', label: 'account.genderFemale' },
  { value: '2', label: 'account.genderOther' },
];

// Tạm thời: backend chưa có API tỉnh/phường → điền từ API khi có
// (tên tỉnh/phường lấy từ API nên không cần dịch, đặt translateLabels = false)
export const PROVINCES: Option[] = [];
export const WARDS: Option[] = [];

// Khung bo góc theo thiết kế
export const PROFILE_CARD_SX = { borderRadius: 2 };