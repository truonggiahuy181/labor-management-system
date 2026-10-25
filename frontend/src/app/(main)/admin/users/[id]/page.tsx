// src/app/(main)/admin/users/[id]/page.tsx  →  /admin/users/:id  (Sửa người dùng)
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import UserDetailForm from '@/Components/UserManagement/UserDetailForm';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { adminUserApi, getErrorMessage, type Profile } from '@/services/user';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const [target, setTarget] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const isAdmin = user?.roleId === ROLE.ADMIN;

  useEffect(() => {
    if (!isAdmin) return;
    adminUserApi.get(Number(id))
      .then(setTarget)
      .catch((err) => {
        setFailed(true);
        enqueueSnackbar(getErrorMessage(err, translate('users.loadFailed')), { variant: 'error' });
      });
  }, [isAdmin, id, enqueueSnackbar, translate]);

  if (user && !isAdmin) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }
  if (failed) return <Typography color="text.secondary">{translate('users.loadFailed')}</Typography>;
  if (!target) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  return <UserDetailForm user={target} />;
}