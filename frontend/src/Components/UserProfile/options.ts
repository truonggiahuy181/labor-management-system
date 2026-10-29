// src/Components/UserProfile/options.ts
// Danh sách chọn dùng chung cho trang Thông tin tài khoản và Chi tiết người dùng
export type Option = { value: string; label: string };

// label là key dịch, khi render mới gọi translate
export const GENDERS: Option[] = [
  { value: '1', label: 'account.genderMale' },
  { value: '0', label: 'account.genderFemale' },
  { value: '2', label: 'account.genderOther' },
];

// Khung bo góc theo thiết kế
export const PROFILE_CARD_SX = { borderRadius: 2 };
