// src/Components/UserProfile/ProfileLayout.tsx
// Khung trang hồ sơ: <form> chứa thanh tiêu đề ở trên, bên dưới là cột trái (ảnh) + cột phải (thông tin)
'use client';
import type { FormEventHandler, ReactNode } from 'react';
import { Stack } from '@mui/material';

export default function ProfileLayout({ onSubmit, header, left, right, children }: {
  onSubmit: FormEventHandler<HTMLFormElement>;
  header: ReactNode;
  left: ReactNode;
  right: ReactNode;
  children?: ReactNode;       // popup đi kèm trang (vd. đổi email)
}) {
  return (
    // Theo thiết kế: các khung bo góc, cách sidebar và nhau 8px (m: -2 bù một phần padding p: 3 của <main>)
    <Stack component="form" spacing={1} sx={{ m: -2 }} onSubmit={onSubmit} noValidate>
      {header}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
        {left}
        {right}
      </Stack>
      {children}
    </Stack>
  );
}