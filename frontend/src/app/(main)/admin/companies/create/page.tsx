// src/app/(main)/admin/companies/create/page.tsx  →  /admin/companies/create  (Thêm doanh nghiệp)
'use client';
import { Typography } from '@mui/material';
import EnterpriseForm from '@/Components/EnterpriseManagement/EnterpriseForm';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';

export default function CreateEnterprisePage() {
  const { user } = useAuth();
  const { translate } = useLocales();

  if (user && user.roleId !== ROLE.ADMIN) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }
  return <EnterpriseForm enterprise={null} />;
}
