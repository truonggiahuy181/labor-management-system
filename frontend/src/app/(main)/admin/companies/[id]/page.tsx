// src/app/(main)/admin/companies/[id]/page.tsx  →  /admin/companies/:id  (Cập nhật doanh nghiệp)
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import EnterpriseForm from '@/Components/EnterpriseManagement/EnterpriseForm';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { enterpriseApi, type Enterprise } from '@/services/enterprise';
import { getErrorMessage } from '@/services/user';

export default function EditEnterprisePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const [target, setTarget] = useState<Enterprise | null>(null);
  const [failed, setFailed] = useState(false);
  const isAdmin = user?.roleId === ROLE.ADMIN;

  // cacheComponents giữ trang đã rời (ẩn đi chứ không huỷ): khi rời trang thì xoá dữ liệu để lần mở sau
  // tải lại doanh nghiệp mới nhất và form bắt đầu lại từ bước 1
  useEffect(() => {
    if (!isAdmin) return;
    enterpriseApi.get(Number(id))
      .then(setTarget)
      .catch((err) => {
        setFailed(true);
        enqueueSnackbar(getErrorMessage(err, translate('enterprises.loadFailed')), { variant: 'error' });
      });
    return () => { setTarget(null); setFailed(false); };
  }, [isAdmin, id, enqueueSnackbar, translate]);

  if (user && !isAdmin) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }
  if (failed) return <Typography color="text.secondary">{translate('enterprises.loadFailed')}</Typography>;
  if (!target) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  return <EnterpriseForm enterprise={target} />;
}
