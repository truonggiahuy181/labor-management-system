import { useEffect, useState } from 'react';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { Alert, Button, Stack, TextField, Typography, type AlertColor } from '@mui/material';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import { authApi, getErrorCode } from '@/services/auth';

const PASSWORD_MIN = 8;
const RESEND_SECONDS = 60;

type ResetForm = { newPassword: string; confirmPassword: string; otp: string };
type Notice = { severity: AlertColor; text: string } | null;

type Props = {
  email: string;          // email đã nhập ở bước 1
  onSuccess: () => void;  // đặt mật khẩu xong thì làm gì (vd. về /login)
};

export default function ResetPasswordForm({ email, onSuccess }: Props) {
  const { translate, translateError } = useLocales();
  const [notice, setNotice] = useState<Notice>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS); // vừa gửi OTP → đếm ngay
  const [resending, setResending] = useState(false);

  const { control, handleSubmit, getValues, formState: { isSubmitting } } = useForm<ResetForm>({
    defaultValues: { newPassword: '', confirmPassword: '', otp: '' },
  });

  // Đếm ngược mỗi giây; về 0 thì dừng
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const showError = (text: string) => setNotice({ severity: 'error', text });

  // Form sai → hiện lỗi của ô đầu tiên
  const onInvalid = (errors: FieldErrors<ResetForm>) =>
    showError(String(Object.values(errors)[0]?.message || translate('common.missingInfo')));

  // Gửi lại OTP
  const resend = async () => {
    setNotice(null);
    setResending(true);
    try {
      const res = await authApi.forgotPassword({ email });
      if (!res.success) return showError(translateError(res.code));
      setCountdown(RESEND_SECONDS);
      setNotice({ severity: 'success', text: translate('forgotPassword.sendSuccess') });
    } catch (err) {
      showError(translateError(getErrorCode(err)));
    } finally {
      setResending(false);
    }
  };

  // Khôi phục mật khẩu
  const onSubmit = async ({ otp, newPassword }: ResetForm) => {
    setNotice(null);
    try {
      const res = await authApi.resetPassword({ email, otp: otp.trim(), newPassword });
      if (!res.success) return showError(translateError(res.code));
      onSuccess();
    } catch (err) {
      showError(translateError(getErrorCode(err)));
    }
  };

  const missing = translate('common.missingInfo');

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>
        {translate('forgotPassword.title')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {translate('forgotPassword.otpSent')}
        <br />
        <b>{email}</b>
        <br />
        {translate('forgotPassword.otpGuide')}
      </Typography>

      {notice && <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <Controller
        name="newPassword"
        control={control}
        rules={{
          required: missing,
          minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) },
        }}
        render={({ field, fieldState }) => (
          <PasswordField {...field} required size="small" label={translate('forgotPassword.newPassword')}
            autoComplete="new-password" autoFocus error={!!fieldState.error} />
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        rules={{
          required: missing,
          validate: (v) => v === getValues('newPassword') || translate('signup.passwordMismatch'),
        }}
        render={({ field, fieldState }) => (
          <PasswordField {...field} required size="small" label={translate('forgotPassword.confirmPassword')}
            autoComplete="new-password" error={!!fieldState.error} />
        )}
      />

      <Controller
        name="otp"
        control={control}
        rules={{ required: missing, pattern: { value: /^\d{6}$/, message: translate('forgotPassword.invalidOtp') } }}
        render={({ field, fieldState }) => (
          <TextField {...field} required size="small" label="OTP" autoComplete="one-time-code"
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
            error={!!fieldState.error} />
        )}
      />

      <Typography variant="body2" color="primary" sx={{ fontWeight: 600, textAlign: 'center' }}>
        00:{String(countdown).padStart(2, '0')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {translate('forgotPassword.notReceived')}{' '}
        <Button size="small" disabled={countdown > 0 || resending} onClick={resend}
          sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline', textTransform: 'none' }}>
          {translate('forgotPassword.resend')}
        </Button>
      </Typography>

      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {translate('forgotPassword.submit')}
      </Button>
    </Stack>
  );
}