// src/app/(main)/account/page.tsx  →  /account  (Thông tin tài khoản)
'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, MenuItem, Stack, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import ChangeEmailDialog from '@/Components/ChangeEmailDialog';
import AvatarCard from '@/Components/UserProfile/AvatarCard';
import FormTextField from '@/Components/UserProfile/FormTextField';
import ProfileHeader from '@/Components/UserProfile/ProfileHeader';
import ProfileLayout from '@/Components/UserProfile/ProfileLayout';
import ProfileSections from '@/Components/UserProfile/ProfileSections';
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

  const personal = [
    <TextField key="username" fullWidth size="small" label={translate('account.username')} value={profile?.username ?? ''} disabled required />,
    field('fullName', 'account.fullName', { required: true }),
    <Controller key="dob" name="dob" control={control}
      rules={{ validate: (value) => isNotFutureDate(value) || translate('account.dobFuture') }}
      render={({ field: dobField, fieldState }) => (
        <TextField {...dobField} fullWidth size="small" type="date" label={translate('account.dob')}
          error={!!fieldState.error} helperText={fieldState.error?.message}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: getLocalToday() } }} />
      )} />,
    field('gender', 'account.gender', {}, GENDERS),
    field('title', 'account.title'),
    <TextField key="role" fullWidth size="small" label={translate('account.role')} required disabled value={roleName} />,
    <Stack key="email" direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <TextField fullWidth size="small" label={translate('account.email')} value={profile?.email ?? ''} disabled />
      <Link component="button" type="button" onClick={() => setEmailOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
        {translate('account.change')}
      </Link>
    </Stack>,
  ];

  // Dùng chung khung với trang Chi tiết người dùng (Components/UserProfile)
  return (
    <ProfileLayout onSubmit={handleSubmit(onSubmit)}
      header={<ProfileHeader onCancel={() => profile && reset(toForm(profile))} cancelDisabled={!isDirty}
        saveDisabled={!isDirty || isSubmitting || isUploadingAvatar} />}
      left={<AvatarCard avatarUrl={profile?.avatarUrl} active={profile?.isActive ?? false}
        onAvatarUpload={handleAvatarUpload} isUploadingAvatar={isUploadingAvatar || isSubmitting} />}
      right={
        <ProfileSections personal={personal}
          province={<FormTextField control={control} name="provinceId" label="account.province"
            options={locations.provinceOptions} searchable disabled={locations.loadingProvinces}
            translateLabels={false} onChange={() => setValue('wardId', '', { shouldDirty: true })} />}
          ward={<FormTextField control={control} name="wardId" label="account.ward"
            options={currentWards} searchable
            disabled={!selectedProvince || locations.isLoadingWards(selectedProvince) || currentWards.length === 0}
            translateLabels={false} />}
          address={field('address', 'account.address')} />
      }>
      <ChangeEmailDialog open={emailOpen} currentEmail={profile?.email ?? ''} onClose={() => setEmailOpen(false)}
        onChanged={(email) => setProfile((p) => (p ? { ...p, email } : p))} />
    </ProfileLayout>
  );
}
