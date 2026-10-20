// src/Components/BusinessRegister/EmailOtpDialog.tsx
// Hộp thoại "Xác thực email": nhập OTP trong 60 giây, hết giờ thì cho gửi lại.
// Cha chỉ render khi cần mở, nên mỗi lần mở là state mới (OTP trống, đếm lại 60s).
'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogContent, Link, Stack, TextField, Typography } from '@mui/material';
import useLocales from '@/Hooks/useLocales';
import { getErrorCode } from '@/services/auth';
import { businessApi } from '@/services/business';

const RESEND_SECONDS = 60;

type Props = {
  open: boolean;
  email: string;
  taxCode: string;
  onClose: () => void;
  onVerified: (verifyToken: string) => void;
};

export default function EmailOtpDialog({ open, email, taxCode, onClose, onVerified }: Props) {
  const { translate, translateError } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, countdown]);

  const resend = async () => {
    setError('');
    try {
      const res = await businessApi.sendOtp({ email, taxCode });
      if (!res.success) return setError(translateError(res.code));
      setCountdown(RESEND_SECONDS);
    } catch (err) {
      setError(translateError(getErrorCode(err)));
    }
  };

  const verify = async () => {
    if (!otp.trim()) return setError(t('enterOtp'));
    setSubmitting(true);
    setError('');
    try {
      const res = await businessApi.verifyOtp({ email, otp: otp.trim() });
      if (!res.success) return setError(translateError(res.code));
      onVerified(res.data.verifyToken);
    } catch (err) {
      setError(translateError(getErrorCode(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const mmss = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent>
        <Stack spacing={2} sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase' }}>
            {t('verifyEmailTitle')}
          </Typography>
          <Typography variant="body2">{t('otpSentTo')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{email}</Typography>
          <Typography variant="body2">{t('otpGuide')}</Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            autoFocus
            required
            size="small"
            label="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'one-time-code' } }}
          />

          {countdown > 0 ? (
            <Typography variant="body2" sx={{ color: 'primary.main' }}>{mmss}</Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('notReceived')}{' '}
              <Link component="button" type="button" onClick={resend}>{t('resend')}</Link>
            </Typography>
          )}

          <Button variant="contained" onClick={verify} disabled={submitting}>{t('confirm')}</Button>
          <Button onClick={onClose} color="inherit">{t('cancel')}</Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
