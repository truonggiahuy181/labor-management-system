// src/Components/BusinessRegister/CreatedAccountDialog.tsx
// Popup "Thông tin tài khoản" sau khi Quản trị viên thêm doanh nghiệp:
// tên đăng nhập (= mã số thuế) và mật khẩu tạm để admin gửi cho doanh nghiệp.
'use client';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import useLocales from '@/Hooks/useLocales';
import type { RegisteredAccount } from '@/services/business';

export default function CreatedAccountDialog({ account, onClose }: { account: RegisteredAccount | null; onClose: () => void }) {
  const { translate } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);

  const rows: [string, string | undefined][] = [
    [t('account'), account?.username],
    [t('password'), account?.tempPassword],
  ];

  return (
    <Dialog open={!!account} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'common.white', textAlign: 'center', fontWeight: 700 }}>
        {t('accountTitle')}
      </DialogTitle>
      <DialogContent>
        <Box component="ul" sx={{ pl: 2.5, pt: 2, mb: 0, '& li': { py: 0.5 } }}>
          {rows.map(([label, value]) => (
            <li key={label}>
              <Typography variant="body2" component="span">{label}: </Typography>
              <Typography variant="body2" component="span" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</Typography>
            </li>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
}