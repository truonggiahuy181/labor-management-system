// src/Components/UserManagement/UserDetailForm.tsx
// Trang "Chi tiết người dùng" của Quản trị viên, dùng cho cả thêm mới và sửa:
//   user = null → thêm mới (POST /users), user có giá trị → sửa (PATCH /users/:id, không đổi tên đăng nhập / mật khẩu / email)
// Giao diện dùng chung với trang Thông tin tài khoản (Components/UserProfile)
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import AvatarCard from '@/Components/UserProfile/AvatarCard';
import FormTextField from '@/Components/UserProfile/FormTextField';
import ProfileHeader from '@/Components/UserProfile/ProfileHeader';
import ProfileLayout from '@/Components/UserProfile/ProfileLayout';
import ProfileSections from '@/Components/UserProfile/ProfileSections';
import { GENDERS, PROVINCES, WARDS } from '@/Components/UserProfile/options';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { adminUserApi, getErrorMessage, roleApi, type Profile, type Role, type UserBody } from '@/services/user';
import { ROLE_OPTIONS } from './roleOptions';

type Form = {
  username: string; password: string; fullName: string; dob: string; gender: string; title: string;
  roleId: number; email: string; provinceId: string; wardId: string; address: string; isActive: boolean;
};

export const USERS_PATH = '/admin/users';

// Giới hạn độ dài theo CreateUserDto của backend
const PASSWORD_MIN = 8;
const MAX = { username: 50, fullName: 100, email: 100, title: 100, address: 255 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toForm = (u?: Profile | null): Form => ({
  username: u?.username ?? '', password: '', fullName: u?.fullName ?? '', dob: u?.dob?.slice(0, 10) ?? '',
  gender: u?.gender == null ? '' : String(u.gender), title: u?.title ?? '', roleId: u?.roleId ?? ROLE.ADMIN,
  email: u?.email ?? '', provinceId: u?.provinceId ?? '', wardId: u?.wardId ?? '', address: u?.address ?? '',
  isActive: u?.isActive ?? true,
});

// Ô trống thì không gửi để backend bỏ qua kiểm tra định dạng; giới tính đổi về số
const optional = ({ dob, gender, title, provinceId, wardId, address }: Form) => ({
  ...(dob && { dob }), ...(gender && { gender: Number(gender) }), ...(title && { title }),
  ...(provinceId && { provinceId }), ...(wardId && { wardId }), ...(address && { address }),
});

export default function UserDetailForm({ user }: { user: Profile | null }) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const isEdit = !!user;
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({ defaultValues: toForm(user) });

  useEffect(() => { reset(toForm(user)); }, [user, reset]);

  // Danh sách vai trò đang hoạt động trong DB; null = chưa tải được → dùng ROLE_OPTIONS cố định
  const [roles, setRoles] = useState<Role[] | null>(null);
  useEffect(() => {
    roleApi.list().then((rs) => setRoles(rs.filter((r) => r.isActive))).catch(() => setRoles(null));
  }, []);
  const roleOptions = roles
    ? roles.map((r) => ({ value: r.id, label: r.roleName }))
    : ROLE_OPTIONS.map((o) => ({ value: o.value, label: translate(o.label) }));

  const required = translate('common.required');
  const maxLength = (value: number) => ({ value, message: translate('users.maxLength', { max: value }) });

  const onSubmit = async (values: Form) => {
    const { username, password, fullName, email, roleId, isActive } = values;
    try {
      if (isEdit) await adminUserApi.update(user.id, { fullName, roleId, isActive, ...optional(values) });
      else await adminUserApi.create({ username, password, fullName, email, roleId, isActive, ...optional(values) } satisfies UserBody);
      enqueueSnackbar(translate('common.saveSuccess'), { variant: 'success' });
      router.push(USERS_PATH);
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  const usernameField = (
    <FormTextField control={control} name="username" label="account.username" disabled={isEdit} required
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
    <FormTextField control={control} name="fullName" label="account.fullName" rules={{ required, maxLength: maxLength(MAX.fullName) }} />
  );
  const dobField = <FormTextField control={control} name="dob" label="account.dob" type="date" />;
  const genderField = <FormTextField control={control} name="gender" label="account.gender" options={GENDERS} />;
  const titleField = <FormTextField control={control} name="title" label="account.title" rules={{ maxLength: maxLength(MAX.title) }} />;
  const roleField = (
    <Controller name="roleId" control={control}
      rules={{ validate: (v) => !roles || roles.some((r) => r.id === v) || translate('users.roleInactive') }}
      render={({ field: f, fieldState }) => {
        // Vai trò hiện tại không còn trong DB → vẫn hiện để người dùng thấy và chọn lại
        const missing = !roleOptions.some((o) => o.value === f.value);
        return (
          <TextField {...f} select fullWidth size="small" required label={translate('account.role')}
            error={!!fieldState.error} helperText={fieldState.error?.message}>
            {missing && <MenuItem value={f.value} disabled>{translate('account.roleUnknown', { id: f.value })}</MenuItem>}
            {roleOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        );
      }} />
  );
  const emailField = (
    <FormTextField control={control} name="email" label="account.email" disabled={isEdit}
      rules={isEdit ? undefined : {
        required, maxLength: maxLength(MAX.email), pattern: { value: EMAIL_RE, message: translate('signup.invalidEmail') },
      }} />
  );

  // Thứ tự ô theo thiết kế: thêm mới có Mật khẩu ngay sau Tên đăng nhập; sửa thì không có Mật khẩu
  const personal = isEdit
    ? [usernameField, fullNameField, dobField, genderField, titleField, roleField, emailField]
    : [usernameField, passwordField, fullNameField, dobField, genderField, titleField, roleField, emailField];

  return (
    <ProfileLayout onSubmit={handleSubmit(onSubmit)}
      header={<ProfileHeader onCancel={() => router.push(USERS_PATH)} saveDisabled={isSubmitting} />}
      left={
        <Controller name="isActive" control={control}
          render={({ field: f }) => <AvatarCard avatarUrl={user?.avatarUrl} active={f.value} onActiveChange={f.onChange} />} />
      }
      right={
        <ProfileSections personal={personal}
          province={<FormTextField control={control} name="provinceId" label="account.province" options={PROVINCES} translateLabels={false} />}
          ward={<FormTextField control={control} name="wardId" label="account.ward" options={WARDS} translateLabels={false} />}
          address={<FormTextField control={control} name="address" label="account.address" rules={{ maxLength: maxLength(MAX.address) }} />} />
      } />
  );
}