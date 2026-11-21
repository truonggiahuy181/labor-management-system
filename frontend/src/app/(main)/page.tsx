// src/app/(main)/page.tsx  →  trang chủ sau khi đăng nhập
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import useAuth from '@/Hooks/useAuth';
import { getPostLoginPath } from '@/constants/roles';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getPostLoginPath(user));
    }
  }, [loading, user, router]);

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
}