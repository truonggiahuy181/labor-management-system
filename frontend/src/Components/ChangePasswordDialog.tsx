// src/Components/ChangePasswordDialog.tsx
'use client';
import { Controller, useForm } from 'react-hook-form';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import { getErrorMessage, userApi } from '@/services/user';

type Form = { currentPassword: string; newPassword: string; confirmNewPassword: string };
const PASSWORD_MIN = 8;

// onSuccess: backend đã xoá cookie (FORCE_LOGOUT) → nơi gọi chuyển về /login
export default function ChangePasswordDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const { control, handleSubmit, getValues, reset, formState: { isSubmitting } } = useForm<Form>({
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const required = translate('common.required');
  const close = () => { reset(); onClose(); };

  const onSubmit = async (values: Form) => {
    try {
      await userApi.changePassword(values);
      enqueueSnackbar(translate('changePassword.reloginNotice'), { variant: 'success' });
      reset();
      onSuccess();
    } catch (err) {
      // message lỗi do backend trả về (tiếng Việt) – chưa có thì dùng câu chung theo ngôn ngữ đang chọn
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'common.white', textAlign: 'center', fontWeight: 700 }}>
        {translate('changePassword.title')}
      </DialogTitle>
      <DialogContent>
        <Stack component="form" id="change-password-form" spacing={2} sx={{ pt: 2 }} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller name="currentPassword" control={control} rules={{ required }}
            render={({ field, fieldState }) => (
              <PasswordField {...field} required size="small" label={translate('changePassword.oldPassword')} autoComplete="current-password"
                error={!!fieldState.error} helperText={fieldState.error?.message} />
            )} />
          <Controller name="newPassword" control={control}
            rules={{
              required,
              minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) },
              validate: (v) => v !== getValues('currentPassword') || translate('changePassword.sameAsOld'),
            }}
            render={({ field, fieldState }) => (
              <PasswordField {...field} required size="small" label={translate('changePassword.newPassword')} autoComplete="new-password"
                error={!!fieldState.error} helperText={fieldState.error?.message} />
            )} />
          <Controller name="confirmNewPassword" control={control}
            rules={{ required, validate: (v) => v === getValues('newPassword') || translate('signup.passwordMismatch') }}
            render={({ field, fieldState }) => (
              <PasswordField {...field} required size="small" label={translate('changePassword.confirmNewPassword')} autoComplete="new-password"
                error={!!fieldState.error} helperText={fieldState.error?.message} />
            )} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close}>{translate('common.cancel')}</Button>
        <Button type="submit" form="change-password-form" variant="contained" disabled={isSubmitting}>{translate('common.save')}</Button>
      </DialogActions>
    </Dialog>
  );
}