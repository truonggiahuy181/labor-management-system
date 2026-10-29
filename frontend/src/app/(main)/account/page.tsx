// src/app/(main)/account/page.tsx  →  /account  (Thông tin tài khoản)
'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Box, Button, Card, Divider, Grid, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useSnackbar } from 'notistack';
import ChangeEmailDialog from '@/Components/ChangeEmailDialog';
import AvatarCard from '@/Components/UserProfile/AvatarCard';
import FormTextField from '@/Components/UserProfile/FormTextField';
import useLocales from '@/Hooks/useLocales';
import useLocations from '@/Hooks/useLocations';
import { getErrorMessage, userApi, type Profile, type ProfileUpdate } from '@/services/user';
import { GENDERS, type Option } from '@/Components/UserProfile/options';
import { ROLE } from '@/constants/roles'
import { getLocalToday, isNotFutureDate } from '@/services/date';
type Form = Required<{ [K in keyof ProfileUpdate]: string }>;

const ROLE_KEYS: Record<number, string> = { [ROLE.ADMIN]: 'account.roleAdmin', [ROLE.ENTERPRISE]: 'account.roleEnterprise' };
const EMPTY: Form = { fullName: '', dob: '', gender: '', phoneNumber: '', title: '', provinceId: '', wardId: '', address: '' };

const toForm = (p: Profile): Form => ({
  fullName: p.fullName ?? '',
  dob: p.dob?.slice(0, 10) ?? '',
  gender: p.gender === null ? '' : String(p.gender),
  phoneNumber: p.phoneNumber ?? '',
  title: p.title ?? '',
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const locations = useLocations();
  const { ensureWards } = locations;
  const { control, handleSubmit, reset, setValue, formState: { isSubmitting, isDirty } } = useForm<Form>({ defaultValues: EMPTY });

  const selectedProvince = useWatch({ control, name: 'provinceId' });
  const currentWards = locations.wardsOf(selectedProvince);

  useEffect(() => {
    void ensureWards(selectedProvince);
  }, [ensureWards, selectedProvince]);

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

  const handleAvatarUpload = async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      const updatedProfile = await userApi.uploadAvatar(file);
      setProfile(updatedProfile);
      enqueueSnackbar(translate('account.avatarUploadSuccess'), { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('account.avatarUploadFailed')), { variant: 'error' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Ô nhập dùng chung: labelKey là key dịch; options có thì thành ô chọn
  const field = (
    name: keyof Form,
    labelKey: string,
    extra: object = {},
    options?: Option[],
    translateLabels = true,
    onChangeCustom?: (val: string) => void
  ) => (
    <Controller name={name} control={control}
      render={({ field: f }) => {
        const isUnknown = !!(options && f.value && !options.some((o) => o.value === f.value));
        return (
          <TextField
            {...f}
            {...extra}
            fullWidth
            size="small"
            label={translate(labelKey)}
            select={!!options}
            onChange={(e) => {
              f.onChange(e);
              onChangeCustom?.(e.target.value);
            }}
          >
            {isUnknown && <MenuItem value={f.value} disabled>{f.value}</MenuItem>}
            {options?.map((o) => (
              <MenuItem key={o.value} value={o.value}>{translateLabels ? translate(o.label) : o.label}</MenuItem>
            ))}
          </TextField>
        );
      }} />
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
        <Button type="submit" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={!isDirty || isSubmitting || isUploadingAvatar}>
          {translate('common.save')}
        </Button>
      </Card>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        {/* Cột trái: ảnh đại diện + kích hoạt */}
        <AvatarCard avatarUrl={profile?.avatarUrl} active={profile?.isActive ?? false}
          onAvatarUpload={handleAvatarUpload} isUploadingAvatar={isUploadingAvatar || isSubmitting} />

        {/* Cột phải: thông tin */}
        <Card square sx={{ flex: 1, p: 3, width: '100%' }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>{translate('account.personalInfo')}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label={translate('account.username')} value={profile?.username ?? ''} disabled required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('fullName', 'account.fullName', { required: true })}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="dob" control={control}
                rules={{ validate: (value) => isNotFutureDate(value) || translate('account.dobFuture') }}
                render={({ field: dobField, fieldState }) => (
                  <TextField {...dobField} fullWidth size="small" type="date" label={translate('account.dob')}
                    error={!!fieldState.error} helperText={fieldState.error?.message}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: getLocalToday() } }} />
                )} />
            </Grid>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <FormTextField control={control} name="provinceId" label="account.province"
                options={locations.provinceOptions} searchable disabled={locations.loadingProvinces}
                translateLabels={false} onChange={() => setValue('wardId', '', { shouldDirty: true })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormTextField control={control} name="wardId" label="account.ward"
                options={currentWards} searchable
                disabled={!selectedProvince || locations.isLoadingWards(selectedProvince) || currentWards.length === 0}
                translateLabels={false} />
            </Grid>
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
