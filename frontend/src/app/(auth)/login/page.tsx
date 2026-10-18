// src/app/(auth)/login/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import useAuth from '@/Hooks/useAuth';
import { authApi, getErrorCode } from '@/services/auth';

type LoginForm = { username: string; password: string; remember: boolean };

export default function LoginPage() {
  const { translate, translateError } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const { login } = useAuth();
  const router = useRouter();
  const [alert, setAlert] = useState('');

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>({
    defaultValues: { username: '', password: '', remember: true },
  });

  const onSubmit = async ({ remember, ...body }: LoginForm) => {
    setAlert('');
    try {
      const res = await authApi.login(body);
      if (!res.success) return setAlert(translateError(res.code));
      login(res.data.accessToken, res.data.user, remember);
      enqueueSnackbar(translate('login.success'), { variant: 'success' });
      router.replace('/');
    } catch (err) {
      setAlert(translateError(getErrorCode(err)));
    }
  };

  // Bỏ trống ô nào thì ô đó viền đỏ, kèm một thông báo chung
  const onInvalid = () => setAlert(translate('common.missingInfo'));

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'center' }}>
        {translate('common.appName')}
      </Typography>
      <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase' }}>
        {translate('login.title')}
      </Typography>

      {alert && <Alert severity="error" onClose={() => setAlert('')}>{alert}</Alert>}

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
      <Button component={Link} href="/signup" variant="outlined">
        {translate('login.goSignup')}
      </Button>
    </Stack>
  );
}