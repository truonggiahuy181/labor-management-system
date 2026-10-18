// src/app/(main)/page.tsx  →  trang chủ sau khi đăng nhập
'use client';
import { Typography } from '@mui/material';
import useAuth from '@/Hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();
  return <Typography variant="h5">Xin chào, {user?.username}</Typography>;
}