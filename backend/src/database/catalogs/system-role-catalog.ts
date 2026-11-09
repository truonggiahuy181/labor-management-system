export const SYSTEM_ROLE_CATALOG = [
  ['ADMIN', 'Quản trị viên'],
  ['ENTERPRISE_USER', 'Người dùng doanh nghiệp'],
] as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CATALOG)[number][0];
