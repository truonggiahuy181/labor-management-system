// src/Components/UserManagement/ResetPasswordDialog.tsx
'use client';
import { Controller, useForm } from 'react-hook-form';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { Trans } from 'react-i18next';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import { adminUserApi, getErrorMessage, type Profile } from '@/services/user';

const PASSWORD_MIN = 8;

// Quản trị viên đặt mật khẩu mới cho một tài khoản (popup "Xác nhận" trong thiết kế)
export default function ResetPasswordDialog({ user, onClose }: { user: Profile | null; onClose: () => void }) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { newPassword: '' } });

  const close = () => { reset(); onClose(); };

  const onSubmit = async ({ newPassword }: { newPassword: string }) => {
    if (!user) return;
    try {
      await adminUserApi.resetPassword(user.id, newPassword);
      enqueueSnackbar(translate('users.resetSuccess'), { variant: 'success' });
      close();
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  return (
    <Dialog open={!!user} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'common.white', textAlign: 'center', fontWeight: 700 }}>
        {translate('users.confirmTitle')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ pt: 2, pb: 1.5 }}>
          <Trans i18nKey="users.resetFor" values={{ username: user?.username }} components={{ b: <b /> }} />
        </Typography>
        <form id="reset-password-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller name="newPassword" control={control}
            rules={{
              required: translate('common.required'),
              minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) },
            }}
            render={({ field, fieldState }) => (
              <PasswordField {...field} fullWidth size="small" autoFocus autoComplete="new-password"
                placeholder={translate('users.newPasswordPlaceholder')}
                error={!!fieldState.error} helperText={fieldState.error?.message} />
            )} />
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close}>{translate('common.cancel')}</Button>
        <Button type="submit" form="reset-password-form" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={isSubmitting}>
          {translate('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}