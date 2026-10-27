// src/app/(main)/account/page.tsx  →  /account  (Thông tin tài khoản)
'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Avatar, Box, Button, Card, Divider, FormControlLabel, Grid, Link, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useSnackbar } from 'notistack';
import ChangeEmailDialog from '@/Components/ChangeEmailDialog';
import useLocales from '@/Hooks/useLocales';
import { getErrorMessage, userApi, type Profile, type ProfileUpdate } from '@/services/user';
import { ROLE } from '@/constants/roles'
type Form = Required<{ [K in keyof ProfileUpdate]: string }>;
type Option = { value: string; label: string };

// label là key dịch, khi render mới gọi translate
const GENDERS: Option[] = [
  { value: '1', label: 'account.genderMale' },
  { value: '0', label: 'account.genderFemale' },
  { value: '2', label: 'account.genderOther' },
];
// Tạm thời: backend chưa có API tỉnh/phường và vai trò → điền từ API khi có
// (tên tỉnh/phường lấy từ API nên không cần dịch, đặt translateLabels = false)
const PROVINCES: Option[] = [];
const WARDS: Option[] = [];
const ROLE_KEYS: Record<number, string> = { [ROLE.ADMIN]: 'account.roleAdmin', [ROLE.ENTERPRISE]: 'account.roleEnterprise' };
const EMPTY: Form = { fullName: '', dob: '', gender: '', phoneNumber: '', title: '', avatarUrl: '', provinceId: '', wardId: '', address: '' };

const toForm = (p: Profile): Form => ({
  fullName: p.fullName ?? '',
  dob: p.dob?.slice(0, 10) ?? '',
  gender: p.gender === null ? '' : String(p.gender),
  phoneNumber: p.phoneNumber ?? '',
  title: p.title ?? '',
  avatarUrl: p.avatarUrl ?? '',
  provinceId: p.provinceId ?? '',
  wardId: p.wardId ?? '',
  address: p.address ?? '',
});

// Form dùng chuỗi rỗng cho ô trống; gửi lên thì bỏ ô trống và đổi gender về số
const toUpdate = (f: Form): ProfileUpdate => {
  const body: ProfileUpdate = {};
  for (const [k, v] of Object.entries(f)) if (v !== '') Object.assign(body, { [k]: v });
  if (f.gender !== '') body.gender = Number(f.gender);
  return body;
};

export default function AccountPage() {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const { control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<Form>({ defaultValues: EMPTY });

  useEffect(() => {
    userApi.getMe()
      .then((p) => { setProfile(p); reset(toForm(p)); })
      .catch((err) => enqueueSnackbar(getErrorMessage(err, translate('account.loadFailed')), { variant: 'error' }));
  }, [reset, enqueueSnackbar, translate]);

  const onSubmit = async (values: Form) => {
    try {
      const p = await userApi.updateMe(toUpdate(values));
      setProfile((old) => (old ? { ...old, ...p } : p));
      reset(toForm({ ...profile!, ...p }));
      enqueueSnackbar(translate('common.saveSuccess'), { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  // Ô nhập dùng chung: labelKey là key dịch; options có thì thành ô chọn
  const field = (name: keyof Form, labelKey: string, extra: object = {}, options?: Option[], translateLabels = true) => (
    <Controller name={name} control={control}
      render={({ field: f }) => (
        <TextField {...f} {...extra} fullWidth size="small" label={translate(labelKey)} select={!!options}>
          {options?.map((o) => (
            <MenuItem key={o.value} value={o.value}>{translateLabels ? translate(o.label) : o.label}</MenuItem>
          ))}
        </TextField>
      )} />
  );

  const roleName = profile
    ? ROLE_KEYS[profile.roleId] ? translate(ROLE_KEYS[profile.roleId]) : translate('account.roleUnknown', { id: profile.roleId })
    : '';

  return (
    // m: -3 bù lại padding p: 3 của <main> trong (main)/layout.tsx → cả trang tràn sát sidebar và mép phải
    <Stack component="form" spacing={2} sx={{ m: -3 }} onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Thanh tiêu đề + Huỷ bỏ / Lưu */}
      <Card square elevation={1} sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>{translate('account.detail')}</Typography>
        <Button disabled={!isDirty} onClick={() => profile && reset(toForm(profile))}>{translate('common.cancel')}</Button>
        <Button type="submit" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={!isDirty || isSubmitting}>
          {translate('common.save')}
        </Button>
      </Card>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        {/* Cột trái: ảnh đại diện + kích hoạt */}
        <Card square sx={{ width: { xs: '100%', md: 260 }, p: 3, flexShrink: 0 }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Avatar src={profile?.avatarUrl ?? undefined} sx={{ width: 120, height: 120, bgcolor: 'grey.100', color: 'text.secondary' }}>
              <Stack sx={{ alignItems: 'center' }}>
                <PhotoCameraOutlinedIcon />
                <Typography variant="caption">{translate('account.uploadAvatar')}</Typography>
              </Stack>
            </Avatar>
            <Typography variant="caption" color="text.secondary">{translate('account.avatarHint')}</Typography>
          </Stack>
          <FormControlLabel sx={{ mt: 3, ml: 0, width: '100%', justifyContent: 'space-between' }} labelPlacement="start"
            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{translate('account.active')}</Typography>}
            control={<Switch checked={profile?.isActive ?? false} disabled />} />
        </Card>

        {/* Cột phải: thông tin */}
        <Card square sx={{ flex: 1, p: 3, width: '100%' }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>{translate('account.personalInfo')}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label={translate('account.username')} value={profile?.username ?? ''} disabled required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('fullName', 'account.fullName', { required: true })}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('dob', 'account.dob', { type: 'date', slotProps: { inputLabel: { shrink: true } } })}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('gender', 'account.gender', {}, GENDERS)}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('title', 'account.title')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label={translate('account.role')} required disabled value={roleName} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <TextField fullWidth size="small" label={translate('account.email')} value={profile?.email ?? ''} disabled />
                <Link component="button" type="button" onClick={() => setEmailOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
                  {translate('account.change')}
                </Link>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography sx={{ fontWeight: 700, mb: 2 }}>{translate('account.contactInfo')}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>{field('provinceId', 'account.province', {}, PROVINCES, false)}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('wardId', 'account.ward', {}, WARDS, false)}</Grid>
            <Grid size={12}>{field('address', 'account.address')}</Grid>
          </Grid>
        </Card>
      </Stack>

      <Box>
        <ChangeEmailDialog open={emailOpen} currentEmail={profile?.email ?? ''} onClose={() => setEmailOpen(false)}
          onChanged={(email) => setProfile((p) => (p ? { ...p, email } : p))} />
      </Box>
    </Stack>
  );
}