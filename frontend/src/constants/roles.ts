// src/constants/roles.ts
// ROLE: role_id mặc định của backend – chỉ dùng cho form/lọc gửi roleId lên API (quản lý người dùng)
export const ROLE = { ADMIN: 1, ENTERPRISE: 2 } as const;
export type RoleId = (typeof ROLE)[keyof typeof ROLE];

// role_code của backend – id do DB tự cấp nên có thể khác 1/2, phân quyền phải so theo mã
export const ROLE_CODE = { ADMIN: 'ADMIN', ENTERPRISE: 'ENTERPRISE_USER' } as const;
export type RoleKey = keyof typeof ROLE_CODE;

export const ROLE_LABEL: Record<RoleKey, string> = {
  ADMIN: 'account.roleAdmin',
  ENTERPRISE: 'account.roleEnterprise',
};

type RoleHolder = { roleId: number; roleCode?: string | null } | null | undefined;

// Ưu tiên roleCode (login, /auth/me trả về); phiên cũ/mock chưa có roleCode thì so theo roleId
export const hasRole = (user: RoleHolder, ...roles: RoleKey[]) =>
  !!user && roles.some((role) => (user.roleCode ? user.roleCode === ROLE_CODE[role] : user.roleId === ROLE[role]));

export const getRoleKey = (user: RoleHolder): RoleKey | null =>
  (Object.keys(ROLE_CODE) as RoleKey[]).find((role) => hasRole(user, role)) ?? null;
