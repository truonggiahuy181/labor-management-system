// src/Components/UserManagement/UserDetailForm.tsx
// Trang "Chi tiết người dùng" của Quản trị viên, dùng cho cả thêm mới và sửa:
//   user = null → thêm mới (POST /users), user có giá trị → sửa (PATCH /users/:id, không đổi tên đăng nhập / mật khẩu / email)
// Giao diện dùng chung với trang Thông tin tài khoản (Components/UserProfile)
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import AvatarCard from '@/Components/UserProfile/AvatarCard';
import FormTextField from '@/Components/UserProfile/FormTextField';
import ProfileHeader from '@/Components/UserProfile/ProfileHeader';
import ProfileLayout from '@/Components/UserProfile/ProfileLayout';
import ProfileSections from '@/Components/UserProfile/ProfileSections';
import { GENDERS } from '@/Components/UserProfile/options';
import useLocales from '@/Hooks/useLocales';
import useLocations from '@/Hooks/useLocations';
import { ROLE } from '@/constants/roles';
import { adminUserApi, getErrorMessage, roleApi, type Profile, type Role, type UserBody } from '@/services/user';
import { ROLE_OPTIONS } from './roleOptions';
import { getLocalToday, isNotFutureDate } from '@/services/date';
import { notBlank, stripSpaces } from '@/services/text';

type Form = {
  username: string; password: string; fullName: string; dob: string; gender: string; title: string;
  roleId: number; email: string; provinceId: string; wardId: string; address: string; isActive: boolean;
};
type PendingAvatar = { file: File; previewUrl: string };

export const USERS_PATH = '/admin/users';

// Giới hạn độ dài theo CreateUserDto của backend
const PASSWORD_MIN = 8;
// Mật khẩu điền sẵn khi thêm mới người dùng (giống mật khẩu mặc định của tài khoản doanh nghiệp)
const DEFAULT_PASSWORD = '12345678';
const MAX = { username: 50, fullName: 100, email: 100, title: 100, address: 255 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENTERPRISE_ROLE_CODE = 'ENTERPRISE_USER';

const toForm = (u?: Profile | null): Form => ({
  username: u?.username ?? '', password: u ? '' : DEFAULT_PASSWORD, fullName: u?.fullName ?? '', dob: u?.dob?.slice(0, 10) ?? '',
  gender: u?.gender == null ? '' : String(u.gender), title: u?.title ?? '', roleId: u?.roleId ?? ROLE.ADMIN,
  email: u?.email ?? '',
  provinceId: u?.provinceId ?? '',
  wardId: u?.wardId ?? '', address: u?.address ?? '',
  isActive: u?.isActive ?? true,
});

// Ô trống (kể cả chỉ có dấu cách) thì không gửi để backend bỏ qua kiểm tra định dạng; giới tính đổi về số
const optional = ({ dob, gender, title, provinceId, wardId, address }: Form) => ({
  ...(dob && { dob }), ...(gender && { gender: Number(gender) }), ...(title.trim() && { title: title.trim() }),
  ...(provinceId && { provinceId }), ...(wardId && { wardId }), ...(address.trim() && { address: address.trim() }),
});

export default function UserDetailForm({ user }: { user: Profile | null }) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const isEdit = !!user;
  const [uploadedAvatar, setUploadedAvatar] = useState<{ userId: number; url: string | null } | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const locations = useLocations();
  const { ensureWards } = locations;
  const { control, handleSubmit, reset, setValue, getValues, formState: { isSubmitting } } = useForm<Form>({ defaultValues: toForm(user) });

  const selectedProvince = useWatch({ control, name: 'provinceId' });
  const currentWards = locations.wardsOf(selectedProvince);

  useEffect(() => {
    void ensureWards(selectedProvince);
  }, [ensureWards, selectedProvince]);

  useEffect(() => { reset(toForm(user)); }, [user, reset]);
  useEffect(() => () => {
    if (pendingAvatar) URL.revokeObjectURL(pendingAvatar.previewUrl);
  }, [pendingAvatar]);
  const avatarUrl = pendingAvatar?.previewUrl ?? (uploadedAvatar && uploadedAvatar.userId === user?.id
    ? uploadedAvatar.url
    : user?.avatarUrl ?? null);

  // Danh sách vai trò đang hoạt động trong DB; null = chưa tải được → dùng ROLE_OPTIONS cố định
  const [roles, setRoles] = useState<Role[] | null>(null);
  useEffect(() => {
    roleApi.list().then((rs) => setRoles(rs.filter((r) => r.isActive))).catch(() => setRoles(null));
  }, []);
  const roleOptions = roles
    ? roles.filter((r) => isEdit || r.roleCode !== ENTERPRISE_ROLE_CODE).map((r) => ({ value: r.id, label: r.roleName }))
    : ROLE_OPTIONS.filter((o) => isEdit || o.value !== ROLE.ENTERPRISE).map((o) => ({ value: o.value, label: translate(o.label) }));

  const required = translate('common.required');
  const maxLength = (value: number) => ({ value, message: translate('users.maxLength', { max: value }) });

  const onSubmit = async (values: Form) => {
    const { username, password, email, roleId, isActive } = values;
    const fullName = values.fullName.trim();
    try {
      if (isEdit) {
        // Chỉ gửi email khi đổi để backend không phải kiểm tra trùng
        const emailChanged = email.trim().toLowerCase() !== (user.email ?? '').toLowerCase();
        await adminUserApi.update(user.id, { fullName, isActive, ...(emailChanged && { email: email.trim() }), ...optional(values) });
      }
      else {
        const createdUser = await adminUserApi.create({ username, password, fullName, email, roleId, isActive, ...optional(values) } satisfies UserBody);
        if (pendingAvatar) {
          try {
            await adminUserApi.uploadAvatar(createdUser.id, pendingAvatar.file);
          } catch (avatarError) {
            enqueueSnackbar(getErrorMessage(avatarError, translate('users.avatarUploadAfterCreateFailed')), { variant: 'warning' });
            router.push(`${USERS_PATH}/${createdUser.id}`);
            return;
          }
        }
      }
      enqueueSnackbar(translate('common.saveSuccess'), { variant: 'success' });
      router.push(USERS_PATH);
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  // Nhấn Enter để lưu thì ô chưa bị rời (chưa bỏ khoảng trắng) → bỏ ở tên đăng nhập / email trước khi kiểm tra
  const submitForm = (e?: React.BaseSyntheticEvent) => {
    for (const name of ['username', 'email'] as const) setValue(name, stripSpaces(getValues(name)));
    return handleSubmit(onSubmit)(e);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) {
      setPendingAvatar({ file, previewUrl: URL.createObjectURL(file) });
      return;
    }
    try {
      setIsUploadingAvatar(true);
      const updatedUser = await adminUserApi.uploadAvatar(user.id, file);
      setUploadedAvatar({ userId: user.id, url: updatedUser.avatarUrl });
      enqueueSnackbar(translate('account.avatarUploadSuccess'), { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('account.avatarUploadFailed')), { variant: 'error' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const usernameField = (
    <FormTextField control={control} name="username" label="account.username" disabled={isEdit} required noSpaces
      rules={isEdit ? undefined : {
        required, maxLength: maxLength(MAX.username),
        pattern: { value: /^[a-zA-Z0-9_-]+$/, message: translate('users.invalidUsername') },
      }} />
  );

  const passwordField = (
    <Controller name="password" control={control}
      rules={{ required, minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) } }}
      render={({ field: f, fieldState }) => (
        <PasswordField {...f} fullWidth size="small" required autoComplete="new-password" label={translate('users.password')}
          error={!!fieldState.error} helperText={fieldState.error?.message} />
      )} />
  );
  const fullNameField = (
    <FormTextField control={control} name="fullName" label="account.fullName" rules={{ required, maxLength: maxLength(MAX.fullName), validate: (v) => notBlank(v) || required }} />
  );
  const dobField = <FormTextField control={control} name="dob" label="account.dob" type="date" max={getLocalToday()}
    rules={{ validate: (value) => isNotFutureDate(String(value ?? '')) || translate('account.dobFuture') }} />;
  const genderField = <FormTextField control={control} name="gender" label="account.gender" options={GENDERS} />;
  const titleField = <FormTextField control={control} name="title" label="account.title" rules={{ maxLength: maxLength(MAX.title) }} />;
  const roleField = (
    <Controller name="roleId" control={control}
      rules={{ validate: (v) => isEdit || !roles || roleOptions.some((o) => o.value === v) || translate('users.roleInactive') }}
      render={({ field: f, fieldState }) => {
        // Vai trò hiện tại không còn trong DB → vẫn hiện để người dùng thấy và chọn lại
        const missing = !roleOptions.some((o) => o.value === f.value);
        return (
          <TextField {...f} select fullWidth size="small" required label={translate('account.role')} disabled={isEdit}
            error={!!fieldState.error} helperText={fieldState.error?.message ?? (isEdit ? undefined : translate('users.enterpriseRoleHint'))}>
            {missing && <MenuItem value={f.value} disabled>{translate('account.roleUnknown', { id: f.value })}</MenuItem>}
            {roleOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        );
      }} />
  );
  // Quản trị viên sửa được email; tài khoản doanh nghiệp đổi email thì backend đổi cùng email doanh nghiệp
  const emailField = (
    <FormTextField control={control} name="email" label="account.email" noSpaces
      hint={user?.enterpriseId ? translate('users.enterpriseEmailHint') : undefined}
      rules={{
        required, maxLength: maxLength(MAX.email), pattern: { value: EMAIL_RE, message: translate('signup.invalidEmail') },
      }} />
  );

  // Thứ tự ô theo thiết kế: thêm mới có Mật khẩu ngay sau Tên đăng nhập; sửa thì không có Mật khẩu
  const personal = isEdit
    ? [usernameField, fullNameField, dobField, genderField, titleField, roleField, emailField]
    : [usernameField, passwordField, fullNameField, dobField, genderField, titleField, roleField, emailField];

  return (
    <ProfileLayout onSubmit={submitForm}
      header={<ProfileHeader onCancel={() => router.push(USERS_PATH)} saveDisabled={isSubmitting || isUploadingAvatar} />}
      left={
        <Controller name="isActive" control={control}
          render={({ field: f }) => <AvatarCard avatarUrl={avatarUrl} active={f.value} onActiveChange={f.onChange}
            onAvatarUpload={handleAvatarUpload} isUploadingAvatar={isUploadingAvatar || isSubmitting} />} />
      }
      right={
        <ProfileSections personal={personal}
          province={<FormTextField control={control} name="provinceId" label="account.province" options={locations.provinceOptions} searchable disabled={locations.loadingProvinces} translateLabels={false} onChange={() => setValue('wardId', '')} />}
          ward={<FormTextField control={control} name="wardId" label="account.ward" options={currentWards} searchable disabled={!selectedProvince || locations.isLoadingWards(selectedProvince) || currentWards.length === 0} translateLabels={false} />}
          address={<FormTextField control={control} name="address" label="account.address" rules={{ maxLength: maxLength(MAX.address) }} />} />
      } />
  );
}
