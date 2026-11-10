// src/app/(main)/company-info/page.tsx  →  /company-info  (Thông tin doanh nghiệp của tài khoản doanh nghiệp)
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import EnterpriseForm from '@/Components/EnterpriseManagement/EnterpriseForm';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { hasRole } from '@/constants/roles';
import { enterpriseApi, type Enterprise } from '@/services/enterprise';
import { getErrorMessage } from '@/services/user';

export default function CompanyInfoPage() {
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [failed, setFailed] = useState(false);
  const isEnterprise = hasRole(user, 'ENTERPRISE');

  const load = useCallback(() => enterpriseApi.me()
    .then(setEnterprise)
    .catch((err) => {
      setFailed(true);
      enqueueSnackbar(getErrorMessage(err, translate('enterprises.myLoadFailed')), { variant: 'error' });
    }), [enqueueSnackbar, translate]);

  // cacheComponents giữ trang đã rời (ẩn đi chứ không huỷ): rời trang thì xoá dữ liệu để lần mở sau tải lại
  useEffect(() => {
    if (!isEnterprise) return;
    void load();
    return () => { setEnterprise(null); setFailed(false); };
  }, [isEnterprise, load]);

  if (user && !isEnterprise) {
    return <Typography color="text.secondary">{translate('enterprises.enterpriseOnly')}</Typography>;
  }
  if (failed) return <Typography color="text.secondary">{translate('enterprises.myLoadFailed')}</Typography>;
  if (!enterprise) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  // key theo updatedAt: lưu xong tải lại thì form dựng lại từ dữ liệu mới, về bước 1
  return <EnterpriseForm key={enterprise.updatedAt} enterprise={enterprise} self onSaved={load} />;
}
