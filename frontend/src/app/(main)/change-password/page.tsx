// src/app/(main)/change-password/page.tsx
'use client';
import { Controller, useForm } from 'react-hook-form';
import { Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import { authApi, getErrorCode } from '@/services/auth';

type ChangePasswordForm = { oldPassword: string; newPassword: string; confirmPassword: string };
const PASSWORD_MIN = 8;

export default function ChangePasswordPage() {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();

  const { control, handleSubmit, getValues, reset, formState: { isSubmitting } } = useForm<ChangePasswordForm>({
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const showError = (code?: string) =>
    enqueueSnackbar(translate(`errors.${code}`, { defaultValue: translate('common.unknownError') }), { variant: 'error' });

  const onSubmit = async (values: ChangePasswordForm) => {
    try {
      const res = await authApi.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      if (!res.success) return showError(res.code);
      enqueueSnackbar(translate('changePassword.success'), { variant: 'success' });
      reset();                                    // xoá trắng form sau khi đổi xong
    } catch (err) {
      showError(getErrorCode(err));
    }
  };

  const required = translate('common.required');

  return (
    <Card sx={{ maxWidth: 480, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Typography variant="h5" fontWeight={700}>{translate('changePassword.title')}</Typography>

          <Controller name="oldPassword" control={control} rules={{ required }}
            render={({ field, fieldState }) => (
              <TextField {...field} type="password" label={translate('changePassword.oldPassword')} autoComplete="current-password"
                error={!!fieldState.error} helperText={fieldState.error?.message} />
            )} />

          <Controller name="newPassword" control={control}
            rules={{
              required,
              minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) },
              validate: (v) => v !== getValues('oldPassword') || translate('changePassword.sameAsOld'),
            }}
            render={({ field, fieldState }) => (
              <TextField {...field} type="password" label={translate('changePassword.newPassword')} autoComplete="new-password"
                error={!!fieldState.error} helperText={fieldState.error?.message} />
            )} />

          <Controller name="confirmPassword" control={control}
            rules={{ required, validate: (v) => v === getValues('newPassword') || translate('signup.passwordMismatch') }}
            render={({ field, fieldState }) => (
              <TextField {...field} type="password" label={translate('signup.confirmPassword')} autoComplete="new-password"
                error={!!fieldState.error} helperText={fieldState.error?.message} />
            )} />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {translate('common.submit')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}