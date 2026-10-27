// src/app/(main)/admin/users/create/page.tsx  →  /admin/users/create  (Thêm mới người dùng)
'use client';
import { Typography } from '@mui/material';
import UserDetailForm from '@/Components/UserManagement/UserDetailForm';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';

export default function CreateUserPage() {
  const { user } = useAuth();
  const { translate } = useLocales();

  if (user && user.roleId !== ROLE.ADMIN) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }
  return <UserDetailForm user={null} />;
}