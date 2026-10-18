// src/app/(main)/layout.tsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import AuthGuard from '@/Components/AuthGuard';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { translate } = useLocales();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <AuthGuard>
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography component={Link} href="/" variant="h6" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
            VNA
          </Typography>
          <Typography variant="body2" color="text.secondary">{user?.username}</Typography>
          <Button component={Link} href="/change-password">{translate('changePassword.title')}</Button>
          <LanguageSwitcher />
          <Button color="error" onClick={handleLogout}>{translate('common.logout')}</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>{children}</Container>
    </AuthGuard>
  );
}