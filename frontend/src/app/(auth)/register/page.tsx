// src/app/(auth)/register/page.tsx  →  /register  (Đăng ký tài khoản doanh nghiệp)
// Form nhiều trường nên layout (auth) bỏ hình minh hoạ, dùng khung rộng cho trang này
'use client';
import { Typography } from '@mui/material';
import BusinessRegisterForm from '@/Components/BusinessRegister/BusinessRegisterForm';
import useLocales from '@/Hooks/useLocales';

export default function BusinessRegisterPage() {
  const { translate } = useLocales();

  return (
    <>
      <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', mb: 2 }}>
        {translate('login.goSignup')}
      </Typography>
      <BusinessRegisterForm />
    </>
  );
}
