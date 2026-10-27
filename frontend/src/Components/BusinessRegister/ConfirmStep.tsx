// src/Components/BusinessRegister/ConfirmStep.tsx
// Bước 2 – Xác nhận đăng ký: xem lại hồ sơ (chỉ đọc). Tên đăng nhập = mã số thuế.
'use client';
import { Box, Paper, Typography } from '@mui/material';
import useLocales from '@/Hooks/useLocales';
import type { BusinessFiles, BusinessInfo } from '@/services/business';
import { FilesTable } from './BusinessInfoStep';
import { DEFAULT_CATALOG, PROVINCES, labelOf, wardsOf, type CatalogOptions } from './options';

const formatDate = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

// "162 đường số 2, Phường X, Thành phố Y" – bỏ phần trống
const joinAddress = (...parts: string[]) => parts.filter(Boolean).join(', ');

type Props = { info: BusinessInfo; files?: BusinessFiles; catalog?: CatalogOptions };   // files bỏ trống = không hiện bảng file

export default function ConfirmStep({ info, files, catalog = DEFAULT_CATALOG }: Props) {
  const { translate } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);

  const rows: [string, string][] = [
    [t('username'), info.taxCode],
    [t('taxCode'), info.taxCode],
    [t('companyName'), info.companyName],
    [t('foreignName'), info.foreignName],
    [t('email'), info.email],
    [t('licenseDate'), formatDate(info.licenseDate)],
    [t('businessType'), labelOf(catalog.businessTypes, info.businessType)],
    [t('mainIndustry'), labelOf(catalog.industries, info.mainIndustry)],
    [t('registeredAddress'), joinAddress(info.address, labelOf(wardsOf(info.province), info.ward), labelOf(PROVINCES, info.province))],
    [t('businessLocation'), joinAddress(
      info.businessLocation,
      labelOf(wardsOf(info.operatingProvince), info.operatingWard),
      labelOf(PROVINCES, info.operatingProvince),
    )],
    [t('leaderName'), info.leaderName],
    [t('leaderPhone'), info.leaderPhone],
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{t('profileSection')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 3fr' }, rowGap: 1.5, columnGap: 2 }}>
          {rows.map(([label, value]) => (
            <Box key={label} sx={{ display: 'contents' }}>
              <Typography variant="body2">{label}:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: { xs: 1, sm: 0 } }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {files && <FilesTable files={files} />}
    </Box>
  );
}
