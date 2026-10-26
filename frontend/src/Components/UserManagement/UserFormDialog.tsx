// src/Components/UserManagement/UserFormDialog.tsx
'use client';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Switch, TextField } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { adminUserApi, getErrorMessage, type Profile } from '@/services/user';
import { ROLE_OPTIONS } from './roleOptions';

type Form = {
  username: string; password: string; fullName: string; email: string;
  phoneNumber: string; title: string; roleId: number; isActive: boolean;
};

const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toForm = (u?: Profile | null): Form => ({
  username: u?.username ?? '', password: '', fullName: u?.fullName ?? '', email: u?.email ?? '',
  phoneNumber: u?.phoneNumber ?? '', title: u?.title ?? '', roleId: u?.roleId ?? ROLE.ADMIN, isActive: u?.isActive ?? true,
});

// user = null → thêm mới, user có giá trị → sửa (không đổi tên đăng nhập / mật khẩu)
export default function UserFormDialog({ open, user, onClose, onSaved }: {
  open: boolean; user: Profile | null; onClose: () => void; onSaved: () => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!user;
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({ defaultValues: toForm() });

  useEffect(() => { if (open) reset(toForm(user)); }, [open, user, reset]);

  const required = translate('common.required');

  const onSubmit = async ({ username, password, phoneNumber, title, ...rest }: Form) => {
    // Ô trống thì không gửi để backend bỏ qua kiểm tra định dạng
    const optional = { ...(phoneNumber && { phoneNumber }), ...(title && { title }) };
    try {
      if (isEdit) await adminUserApi.update(user.id, { ...rest, ...optional });
      else await adminUserApi.create({ username, password, ...rest, ...optional });
      enqueueSnackbar(translate('common.saveSuccess'), { variant: 'success' });
      onSaved();
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'common.white', textAlign: 'center', fontWeight: 700 }}>
        {translate(isEdit ? 'users.editTitle' : 'users.createTitle')}
      </DialogTitle>
      <DialogContent>
        <Grid component="form" id="user-form" container spacing={2} sx={{ pt: 2 }} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="username" control={control}
              rules={isEdit ? {} : { required, pattern: { value: /^[a-zA-Z0-9_-]+$/, message: translate('users.invalidUsername') } }}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth size="small" required disabled={isEdit} label={translate('users.username')}
                  error={!!fieldState.error} helperText={fieldState.error?.message} />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            {!isEdit && (
              <Controller name="password" control={control}
                rules={{ required, minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) } }}
                render={({ field, fieldState }) => (
                  <PasswordField {...field} fullWidth size="small" required autoComplete="new-password" label={translate('users.password')}
                    error={!!fieldState.error} helperText={fieldState.error?.message} />
                )} />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="fullName" control={control} rules={{ required }}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth size="small" required label={translate('users.fullName')}
                  error={!!fieldState.error} helperText={fieldState.error?.message} />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="email" control={control}
              rules={{ required, pattern: { value: EMAIL_RE, message: translate('signup.invalidEmail') } }}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth size="small" required label={translate('users.email')}
                  error={!!fieldState.error} helperText={fieldState.error?.message} />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="phoneNumber" control={control}
              rules={{ pattern: { value: /^[0-9]{10,11}$/, message: translate('users.invalidPhone') } }}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth size="small" label={translate('users.phone')}
                  error={!!fieldState.error} helperText={fieldState.error?.message} />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="title" control={control}
              render={({ field }) => <TextField {...field} fullWidth size="small" label={translate('users.jobTitle')} />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="roleId" control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth size="small" required label={translate('users.role')}>
                  {ROLE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{translate(o.label)}</MenuItem>)}
                </TextField>
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <Controller name="isActive" control={control}
              render={({ field }) => (
                <FormControlLabel label={translate('account.active')}
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} />
              )} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{translate('common.cancel')}</Button>
        <Button type="submit" form="user-form" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={isSubmitting}>
          {translate('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}