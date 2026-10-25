// src/constants/roles.ts
// Khớp role_id của backend (ENTERPRISE_ROLE_ID mặc định = 2)
export const ROLE = { ADMIN: 1, ENTERPRISE: 2 } as const;
export type RoleId = (typeof ROLE)[keyof typeof ROLE];