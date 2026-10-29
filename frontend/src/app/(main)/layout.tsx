// src/app/(main)/layout.tsx
'use client';
import { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AuthGuard from '@/Components/AuthGuard';
import Sidebar from '@/Components/Sidebar';
import useLocales from '@/Hooks/useLocales';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { translate } = useLocales();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AuthGuard>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {sidebarOpen && <Sidebar onToggle={() => setSidebarOpen(false)} />}

        {/* Sidebar đang ẩn thì hiện nút nổi ở góc trái để mở lại
            (đổi ngôn ngữ và đăng xuất nằm trong menu tài khoản ở chân Sidebar) */}
        {!sidebarOpen && (
          <IconButton
            onClick={() => setSidebarOpen(true)}
            aria-label={translate('menu.toggle')}
            sx={{ position: 'fixed', top: 24, left: 12, zIndex: 'appBar', bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'grey.100' } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Nội dung tràn hết chiều ngang còn lại; chừa chỗ cho nút mở Sidebar khi đang ẩn */}
        <Box component="main" sx={{ flex: 1, minWidth: 0, p: 3, pl: sidebarOpen ? 3 : 9 }}>{children}</Box>
      </Box>
    </AuthGuard>
  );
}
