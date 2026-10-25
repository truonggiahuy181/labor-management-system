// src/Components/UserManagement/roleOptions.ts
import { ROLE } from '@/constants/roles';

// label là key dịch, dùng chung cho ô lọc và form người dùng
export const ROLE_OPTIONS = [
  { value: ROLE.ADMIN, label: 'account.roleAdmin' },
  { value: ROLE.ENTERPRISE, label: 'account.roleEnterprise' },
];

export const roleLabel = (roleId: number) => ROLE_OPTIONS.find((o) => o.value === roleId)?.label;