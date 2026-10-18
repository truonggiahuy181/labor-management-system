// src/app/(auth)/forgot-password/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { Alert, Button, Stack, TextField, Typography, type AlertColor } from '@mui/material';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import { authApi, getErrorCode } from '@/services/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const RESEND_SECONDS = 60;

type EmailForm = { email: string };
type ResetForm = { newPassword: string; confirmPassword: string; otp: string };
type Notice = { severity: AlertColor; text: string } | null;

export default function ForgotPasswordPage() {
  const { translate, translateError } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const [email, setEmail] = useState('');            // rỗng = đang ở bước 1
  const [notice, setNotice] = useState<Notice>(null);
  const [countdown, setCountdown] = useState(0);

  const emailForm = useForm<EmailForm>({ defaultValues: { email: '' } });
  const resetForm = useForm<ResetForm>({ defaultValues: { newPassword: '', confirmPassword: '', otp: '' } });

  // Đếm ngược 60 giây, hết giờ mới cho bấm "Gửi lại"
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const showError = (text: string) => setNotice({ severity: 'error', text });
  // Form không hợp lệ → hiện lỗi của ô đầu tiên bị sai
  const onInvalid = (errors: FieldErrors) =>
    showError(String(Object.values(errors)[0]?.message || translate('common.missingInfo')));

  // Bước 1 (và nút "Gửi lại"): server gửi OTP về email
  const sendOtp = async (target: string) => {
    setNotice(null);
    try {
      const res = await authApi.forgotPassword({ email: target });
      if (!res.success) return showError(translateError(res.code));
      setEmail(target);
      setCountdown(RESEND_SECONDS);
      setNotice({ severity: 'success', text: translate('forgotPassword.sendSuccess') });
    } catch (err) {
      showError(translateError(getErrorCode(err)));
    }
  };

  // Bước 2: đặt mật khẩu mới bằng OTP
  const resetPassword = async ({ otp, newPassword }: ResetForm) => {
    setNotice(null);
    try {
      const res = await authApi.resetPassword({ email, otp: otp.trim(), newPassword });
      if (!res.success) return showError(translateError(res.code));
      enqueueSnackbar(translate('forgotPassword.resetSuccess'), { variant: 'success' });
      router.replace('/login');
    } catch (err) {
      showError(translateError(getErrorCode(err)));
    }
  };

  const missing = translate('common.missingInfo');

  const heading = (
    <Typography sx={{ variant: "subtitle1", color: "primary", fontWeight: 700, textAlign: "center", textTransform: "uppercase" }}>
      {translate('forgotPassword.title')}
    </Typography>
  );
  const alertBox = notice && (
    <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert>
  );
  const backToLogin = (
    <Typography sx={{ variant: "body2", color: "text.secondary", textAlign: "center" }}>
      {translate('signup.hasAccount')} <Link href="/login">{translate('login.title')}</Link>
    </Typography>
  );

  // ---------- Bước 1: nhập email ----------
  if (!email) {
    return (
      <Stack component="form" spacing={2} noValidate
        onSubmit={emailForm.handleSubmit(({ email: value }) => sendOtp(value.trim()), onInvalid)}>
        {heading}
        <Typography sx={{ variant: "body2", color: "text.secondary", textAlign: "center" }}>
          {translate('forgotPassword.enterEmail')}
        </Typography>
        {alertBox}
        <Controller
          name="email"
          control={emailForm.control}
          rules={{ required: missing, pattern: { value: EMAIL_RE, message: translate('signup.invalidEmail') } }}
          render={({ field, fieldState }) => (
            <TextField {...field} required size="small" type="email" label="Email"
              autoComplete="email" autoFocus error={!!fieldState.error} />
          )}
        />
        <Button type="submit" variant="contained" disabled={emailForm.formState.isSubmitting}>
          {translate('forgotPassword.sendOtp')}
        </Button>
        {backToLogin}
      </Stack>
    );
  }

  // ---------- Bước 2: mật khẩu mới + OTP ----------
  return (
    <Stack component="form" spacing={2} noValidate onSubmit={resetForm.handleSubmit(resetPassword, onInvalid)}>
      {heading}
      <Typography sx={{ variant: "body2", color: "text.secondary", textAlign: "center" }}>
        {translate('forgotPassword.otpSent')} <b>{email}</b>
        <br />
        {translate('forgotPassword.otpGuide')}
      </Typography>
      {alertBox}

      <Controller
        name="newPassword"
        control={resetForm.control}
        rules={{ required: missing, minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) } }}
        render={({ field, fieldState }) => (
          <PasswordField {...field} required size="small" label={translate('forgotPassword.newPassword')}
            autoComplete="new-password" error={!!fieldState.error} />
        )}
      />
      <Controller
        name="confirmPassword"
        control={resetForm.control}
        rules={{
          required: missing,
          validate: (v) => v === resetForm.getValues('newPassword') || translate('signup.passwordMismatch'),
        }}
        render={({ field, fieldState }) => (
          <PasswordField {...field} required size="small" label={translate('forgotPassword.confirmPassword')}
            autoComplete="new-password" error={!!fieldState.error} />
        )}
      />
      <Controller
        name="otp"
        control={resetForm.control}
        rules={{ required: missing }}
        render={({ field, fieldState }) => (
          <TextField {...field} required size="small" label="OTP" autoComplete="one-time-code"
            slotProps={{ htmlInput: { inputMode: 'numeric' } }} error={!!fieldState.error} />
        )}
      />

      <Typography sx={{ variant: "body2", color: "primary", fontWeight: 600, textAlign: "center" }}>
        00:{String(countdown).padStart(2, '0')}
      </Typography>
      <Typography sx={{ variant: "body2", color: "text.secondary", textAlign: "center" }}>
        {translate('forgotPassword.notReceived')}{' '}
        <Button size="small" disabled={countdown > 0} onClick={() => sendOtp(email)}
          sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}>
          {translate('forgotPassword.resend')}
        </Button>
      </Typography>

      <Button type="submit" variant="contained" disabled={resetForm.formState.isSubmitting}>
        {translate('forgotPassword.submit')}
      </Button>
      {backToLogin}
    </Stack>
  );
}