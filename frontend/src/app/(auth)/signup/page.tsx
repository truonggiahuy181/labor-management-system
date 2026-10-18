// src/app/(auth)/signup/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, type RegisterOptions } from 'react-hook-form';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import PasswordField from '@/Components/PasswordField';
import useLocales from '@/Hooks/useLocales';
import { authApi, getErrorCode, type RegisterBody } from '@/services/auth';

type SignupForm = RegisterBody & { confirmPassword: string };

const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0\d{9}$/;              // 10 số, bắt đầu bằng 0
const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;   // 10 số, chi nhánh thêm -xxx

type FieldConfig = {
  name: keyof SignupForm;
  label: string;
  rules: RegisterOptions<SignupForm, keyof SignupForm>;
  autoComplete?: string;
  password?: boolean;
};

export default function SignupPage() {
  const { translate, translateError } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const [alert, setAlert] = useState('');

  const { control, handleSubmit, getValues, formState: { isSubmitting } } = useForm<SignupForm>({
    defaultValues: { companyName: '', taxCode: '', email: '', phone: '', username: '', password: '', confirmPassword: '' },
  });

  // Tách confirmPassword ra, chỉ gửi những trường server cần
  const onSubmit = async ({ confirmPassword, ...body }: SignupForm) => {
    setAlert('');
    try {
      const res = await authApi.register(body);
      if (!res.success) return setAlert(translateError(res.code));
      enqueueSnackbar(translate('signup.success'), { variant: 'success' });
      router.replace('/login');
    } catch (err) {
      setAlert(translateError(getErrorCode(err)));
    }
  };

  const required = translate('common.required');
  const pattern = (value: RegExp, key: string) => ({ value, message: translate(key) });

  const fields: FieldConfig[] = [
    { name: 'companyName', label: translate('signup.companyName'), rules: { required }, autoComplete: 'organization' },
    { name: 'taxCode', label: translate('signup.taxCode'), rules: { required, pattern: pattern(TAX_CODE_RE, 'signup.invalidTaxCode') } },
    { name: 'email', label: translate('signup.email'), rules: { required, pattern: pattern(EMAIL_RE, 'signup.invalidEmail') }, autoComplete: 'email' },
    { name: 'phone', label: translate('signup.phone'), rules: { required, pattern: pattern(PHONE_RE, 'signup.invalidPhone') }, autoComplete: 'tel' },
    { name: 'username', label: translate('login.username'), rules: { required }, autoComplete: 'username' },
    {
      name: 'password', label: translate('login.password'), autoComplete: 'new-password', password: true,
      rules: { required, minLength: { value: PASSWORD_MIN, message: translate('signup.passwordMin', { min: PASSWORD_MIN }) } },
    },
    {
      name: 'confirmPassword', label: translate('signup.confirmPassword'), autoComplete: 'new-password', password: true,
      rules: { required, validate: (v) => v === getValues('password') || translate('signup.passwordMismatch') },
    },
  ];

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography sx={{ variant: "subtitle1", color: "primary", fontWeight: 700, textAlign: "center", textTransform: "uppercase" }}>
        {translate('signup.title')}
      </Typography>

      {alert && <Alert severity="error" onClose={() => setAlert('')}>{alert}</Alert>}

      {fields.map(({ name, label, rules, autoComplete, password }) => (
        <Controller
          key={name}
          name={name}
          control={control}
          rules={rules}
          render={({ field, fieldState }) => {
            const props = {
              ...field, label, autoComplete, required: true, size: 'small' as const,
              error: !!fieldState.error, helperText: fieldState.error?.message,
            };
            return password ? <PasswordField {...props} /> : <TextField {...props} />;
          }}
        />
      ))}

      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {translate('signup.submit')}
      </Button>

      <Typography sx={{ variant: "body2", color: "text.secondary", textAlign: "center" }}>
        {translate('signup.hasAccount')} <Link href="/login">{translate('login.title')}</Link>
      </Typography>
    </Stack>
  );
}