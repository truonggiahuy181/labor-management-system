// src/Components/UserProfile/ProfileSections.tsx
// Cột phải: "Thông tin cá nhân" (lưới 2 cột, mỗi trang tự truyền các ô) + "Thông tin liên hệ" (Tỉnh, Phường, Địa chỉ)
'use client';
import type { ReactNode } from 'react';
import { Card, Divider, Grid, Typography } from '@mui/material';
import useLocales from '@/Hooks/useLocales';
import { PROFILE_CARD_SX } from './options';

export default function ProfileSections({ personal, province, ward, address }: {
  personal: ReactNode[];
  province: ReactNode;
  ward: ReactNode;
  address: ReactNode;
}) {
  const { translate } = useLocales();
  return (
    <Card sx={{ ...PROFILE_CARD_SX, flex: 1, p: 3, width: '100%' }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>{translate('account.personalInfo')}</Typography>
      <Grid container spacing={2}>
        {personal.map((node, i) => <Grid key={i} size={{ xs: 12, md: 6 }}>{node}</Grid>)}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography sx={{ fontWeight: 700, mb: 2 }}>{translate('account.contactInfo')}</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>{province}</Grid>
        <Grid size={{ xs: 12, md: 6 }}>{ward}</Grid>
        <Grid size={12}>{address}</Grid>
      </Grid>
    </Card>
  );
}