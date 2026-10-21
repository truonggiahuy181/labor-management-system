// src/Components/ChangeEmailDialog.tsx
'use client';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { Button, Dialog, DialogContent, Link, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import { getErrorMessage, userApi } from '@/services/user';

const RESEND_SECONDS = 60;
type Step = 'otp' | 'email';

// Bước 1: nhập OTP gửi về email hiện tại → Bước 2: nhập email mới
export default function ChangeEmailDialog({ open, currentEmail, onClose, onChanged }: {
  open: boolean;
  currentEmail: string;
  onClose: () => void;
  onChanged: (newEmail: string) => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState<Step>('otp');
  const [otp, setOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);

  const showError = (err: unknown) =>
    enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });

  const sendOtp = async () => {
    try {
      await userApi.requestEmailChange();
      setCountdown(RESEND_SECONDS);
    } catch (err) {
      showError(err);
    }
  };

  // Mở popup → gửi OTP ngay
  useEffect(() => {
    if (!open) return;
    userApi.requestEmailChange()
      .then(() => setCountdown(RESEND_SECONDS))
      .catch((err) => enqueueSnackbar(getErrorMessage(err, translate('changeEmail.sendOtpFailed')), { variant: 'error' }));
  }, [open, enqueueSnackbar, translate]);

  // Đóng popup → xoá dữ liệu, lần mở sau bắt đầu lại từ bước 1
  const close = () => {
    setStep('otp'); setOtp(''); setNewEmail('');
    onClose();
  };

  // Đếm ngược 60s trước khi cho gửi lại
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verifyOtp = async () => {
    setBusy(true);
    try {
      await userApi.verifyEmailOtp(otp);
      setStep('email');
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const saveEmail = async () => {
    setBusy(true);
    try {
      await userApi.confirmEmailChange({ newEmail, otp });   // backend kiểm tra lại OTP ở bước này
      enqueueSnackbar(translate('changeEmail.success'), { variant: 'success' });
      onChanged(newEmail);
      close();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogContent>
        <Stack spacing={2} sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>{translate('changeEmail.title')}</Typography>

          {step === 'otp' ? (
            <>
              <Typography variant="body2">
                {/* Trans cho phép in đậm email nằm giữa câu đã dịch */}
                <Trans i18nKey="changeEmail.otpSentTo" values={{ email: currentEmail }} components={{ b: <b /> }} />
              </Typography>
              <Typography variant="body2">{translate('changeEmail.otpGuide')}</Typography>
              <TextField size="small" label={translate('changeEmail.otp')} required value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
              <Typography variant="body2" color="primary">{`00:${String(countdown).padStart(2, '0')}`}</Typography>
              <Typography variant="body2" color="text.secondary">
                {translate('forgotPassword.notReceived')}{' '}
                <Link component="button" disabled={countdown > 0} onClick={sendOtp}
                  sx={{ verticalAlign: 'baseline', color: countdown > 0 ? 'text.disabled' : 'primary.main' }}>
                  {translate('forgotPassword.resendOtp')}
                </Link>
              </Typography>
              <Button variant="contained" onClick={verifyOtp} disabled={otp.length !== 6 || busy}>
                {translate('changeEmail.verify')}
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2">{translate('changeEmail.enterNewEmail')}</Typography>
              <TextField size="small" type="email" label={translate('changeEmail.newEmail')} required value={newEmail}
                onChange={(e) => setNewEmail(e.target.value.trim())} />
              <Button variant="contained" onClick={saveEmail} disabled={!newEmail || busy}>{translate('common.save')}</Button>
            </>
          )}

          <Button onClick={close}>{translate('common.cancel')}</Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}