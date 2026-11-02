// src/app/(auth)/login/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import useAuth from '@/Hooks/useAuth';
import { authApi, getErrorCode } from '@/services/auth';
import BusinessRegisterDialog from '@/Components/BusinessRegister/BusinessRegisterDialog';

type LoginForm = { username: string; password: string; remember: boolean };

// Toast lỗi tự đóng sau khoảng thời gian này
const ALERT_DURATION_MS = 6000;

export default function LoginPage() {
  const { translate, translateError } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const { login } = useAuth();
  const router = useRouter();
  const [registerOpen, setRegisterOpen] = useState(false)

  const { control, handleSubmit, setValue, formState: { isSubmitting } } = useForm<LoginForm>({
    defaultValues: { username: '', password: '', remember: true },
  });

  const showError = (code?: string) => {
    // Tài khoản bị vô hiệu hóa: toast cảnh báo kèm hướng dẫn liên hệ quản trị viên
    if (code === 'ACCOUNT_INACTIVE') {
      enqueueSnackbar(
        <Stack>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{translate('login.inactiveTitle')}</Typography>
          <Typography variant="body2">{translate('login.inactiveMessage')}</Typography>
        </Stack>,
        { variant: 'warning', autoHideDuration: ALERT_DURATION_MS, preventDuplicate: true },
      );
      return;
    }
    enqueueSnackbar(translateError(code), { variant: 'error', autoHideDuration: ALERT_DURATION_MS });
  };

  const onSubmit = async ({ remember, ...body }: LoginForm) => {
    try {
      const res = await authApi.login({ ...body, rememberMe: remember });
      if (!res.success) return showError(res.code);
      login(res.data.user);
      router.replace('/account');
      enqueueSnackbar(translate('login.success'), { variant: 'success' });
    } catch (err) {
      showError(getErrorCode(err));
    }
  };

  // Bỏ trống ô nào thì ô đó viền đỏ, kèm một thông báo chung
  const onInvalid = () =>
    enqueueSnackbar(translate('common.missingInfo'), { variant: 'error', autoHideDuration: ALERT_DURATION_MS });

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'center' }}>
        {translate('common.appName')}
      </Typography>
      <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase' }}>
        {translate('login.title')}
      </Typography>

      <Controller
        name="username"
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <TextField {...field} required size="small" label={translate('login.username')}
            autoComplete="username" autoFocus error={!!fieldState.error} />
        )}
      />

      <Controller
        name="password"
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <PasswordField {...field} required size="small" label={translate('login.password')}
            autoComplete="current-password" error={!!fieldState.error} />
        )}
      />

      {/* direction là prop của Stack; căn chỉnh để trong sx */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Controller
          name="remember"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              label={<Typography variant="body2">{translate('login.remember')}</Typography>}
              control={<Checkbox size="small" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
            />
          )}
        />
        <Typography
          component={Link}
          href="/forgot-password"
          variant="body2"
          sx={{ color: 'primary.main', textDecoration: 'none' }}
        >
          {translate('login.forgotPassword')}
        </Typography>
      </Stack>

      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {translate('login.title')}
      </Button>
      <Button variant="outlined" onClick={() => setRegisterOpen(true)}>
        {translate('login.goSignup')}
      </Button>
      <BusinessRegisterDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={(username) => setValue('username', username)}
      />
    </Stack>
  );
}