// src/Components/AuthGuard.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import useAuth from '@/Hooks/useAuth';

// Chỉ cho người đã đăng nhập vào; chưa đăng nhập thì chuyển về /login
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }

  return <>{children}</>;
}