// src/app/(auth)/layout.tsx
'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, Card, CircularProgress } from '@mui/material';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import useAuth from '@/Hooks/useAuth';

const WIDE_PAGES = ['/register'];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user) router.replace('/account');
  }, [loading, user, router]);

  if (loading || user) {
    return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }

  // Trang có form nhiều trường (Đăng ký doanh nghiệp): bỏ hình minh hoạ, Card rộng hết cỡ
  if (WIDE_PAGES.includes(pathname)) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: { xs: 2, md: 4 }, px: 2 }}>
        <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1 }}><LanguageSwitcher /></Box>
        <Card sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 4 }, borderRadius: 2, boxShadow: '0 4px 24px rgba(145, 158, 171, 0.24)' }}>
          <Box component="img" src="/images/quoc-huy.png" alt="Quốc huy" sx={{ display: 'block', width: 72, height: 72, mx: 'auto', mb: 1 }} />
          {children}
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: { xs: 'grey.100', md: 'common.white' } }}>
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1 }}><LanguageSwitcher /></Box>

      {/* Cột trái: hình minh hoạ, ẩn khi màn hình nhỏ hơn md (900px) */}
      <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Box component="img" src="/images/auth-illustration.png" alt="" sx={{ width: '100%', minWidth: 820,minHeight: '85vh' }} />
      </Box>

      {/* Cột phải: Card chứa form của từng trang */}
      <Box sx={{ width: { xs: '100%', md: '45%' }, minWidth: { md: 460 }, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2}}>
        <Card sx={{ width: '100%', maxWidth: 600, p: 4, borderRadius: 2, boxShadow: '0 4px 24px rgba(145, 158, 171, 0.24)' }}>
          <Box component="img" src="/images/quoc-huy.png" alt="Quốc huy" sx={{ display: 'block', width: 88, height: 88, mx: 'auto', mb: 2 }} />
          {children}
        </Card>
      </Box>
    </Box>
  );
}