// src/Hooks/useRoles.ts
// Danh sách vai trò thật từ GET /roles (chỉ Quản trị viên gọi được).
// role_id do DB tự cấp nên có thể khác 1/2 → nhãn và lựa chọn phải lấy theo id thật, dịch theo role_code.
'use client';
import { useEffect, useMemo, useState } from 'react';
import { ROLE, ROLE_CODE, ROLE_LABEL, type RoleKey } from '@/constants/roles';
import { roleApi, type Role } from '@/services/user';
import useLocales from '@/Hooks/useLocales';

// Tải 1 lần cho mọi trang dùng chung; lỗi thì lần sau thử lại
let cache: Promise<Role[]> | null = null;
const loadRoles = () => {
  cache ??= roleApi.list().catch((error) => {
    cache = null;
    throw error;
  });
  return cache;
};

const keyOf = (roleCode: string) =>
  (Object.keys(ROLE_CODE) as RoleKey[]).find((key) => ROLE_CODE[key] === roleCode);

// Chưa tải được /roles thì tạm dùng id mặc định của backend
const FALLBACK: Role[] = (Object.keys(ROLE_CODE) as RoleKey[]).map((key) => ({
  id: ROLE[key],
  roleCode: ROLE_CODE[key],
  roleName: '',
  isActive: true,
}));

export default function useRoles() {
  const { translate } = useLocales();
  const [roles, setRoles] = useState<Role[] | null>(null);

  useEffect(() => {
    let active = true;
    loadRoles()
      .then((rows) => active && setRoles(rows.filter((role) => role.isActive)))
      .catch(() => active && setRoles(null));
    return () => { active = false; };
  }, []);

  return useMemo(() => {
    const list = roles ?? FALLBACK;
    const nameOf = (role: Role) => {
      const key = keyOf(role.roleCode);
      return key ? translate(ROLE_LABEL[key]) : role.roleName;
    };
    return {
      loaded: roles !== null,
      roles: list,
      idOf: (key: RoleKey) => list.find((role) => role.roleCode === ROLE_CODE[key])?.id,
      options: list.map((role) => ({ value: role.id, label: nameOf(role), roleCode: role.roleCode })),
      labelOf: (roleId: number) => {
        const role = list.find((item) => item.id === roleId);
        return role ? nameOf(role) : translate('account.roleUnknown', { id: roleId });
      },
    };
  }, [roles, translate]);
}
