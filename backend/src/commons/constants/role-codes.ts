export const RoleCode = {
  ADMIN: 'ADMIN',
  ENTERPRISE_USER: 'ENTERPRISE_USER',
} as const;

export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];
