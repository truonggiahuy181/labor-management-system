// src/Components/BusinessRegister/AccountInfoDialog.tsx
// Popup "Thông tin tài khoản" hiện sau khi đăng ký thành công.
// Hiện luôn mật khẩu tạm (server trả về 1 lần, đồng thời gửi qua email) kèm nút sao chép.
'use client';
import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography,
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ContentCopy from '@mui/icons-material/ContentCopy';
import useLocales from '@/Hooks/useLocales';
import type { RegisteredAccount } from '@/services/business';

type Props = {
  account: RegisteredAccount | null;     // null = đóng
  onClose: () => void;
  onLogin: (username: string) => void;   // "Đăng nhập ngay": điền sẵn tên đăng nhập ở trang login
};

export default function AccountInfoDialog({ account, onClose, onLogin }: Props) {
  const { translate } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);
  const [copied, setCopied] = useState('');        // label của dòng vừa sao chép

  const copy = async (label: string, text: string) => {
    await navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  // [nhãn, giá trị, có nút sao chép, là mật khẩu]
  const rows: [string, string, boolean, boolean][] = account
    ? [
        [t('companyName'), account.companyName, false, false],
        [t('username'), account.username, true, false],
        [t('tempPassword'), account.tempPassword, true, true],
        [t('email'), account.email, false, false],
      ]
    : [];

  return (
    <Dialog open={!!account} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <CheckCircle color="success" sx={{ fontSize: 48, display: 'block', mx: 'auto', mb: 1 }} />
        <Typography component="span" variant="h6" sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase' }}>
          {t('accountTitle')}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ textAlign: 'center', mb: 2 }}>{t('accountCreated')}</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', rowGap: 1, columnGap: 2, alignItems: 'center' }}>
          {rows.map(([label, value, copyable, isPassword]) => (
            <Box key={label} sx={{ display: 'contents' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere', fontFamily: isPassword ? 'monospace' : undefined }}>
                  {value}
                </Typography>
                {copyable && (
                  <Tooltip title={copied === label ? t('copied') : t('copy')}>
                    <IconButton size="small" onClick={() => copy(label, value)} aria-label={t('copy')}>
                      <ContentCopy fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          {t('passwordSentTo')} <strong>{account?.email}</strong>. {t('changePasswordHint')}
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>{t('close')}</Button>
        <Button variant="contained" onClick={() => account && onLogin(account.username)}>{t('loginNow')}</Button>
      </DialogActions>
    </Dialog>
  );
}