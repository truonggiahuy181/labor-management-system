// src/app/(main)/layout.tsx
'use client';
import { useState } from 'react';
import { AppBar, Box, IconButton, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AuthGuard from '@/Components/AuthGuard';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import Sidebar from '@/Components/Sidebar';
import useLocales from '@/Hooks/useLocales';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { translate } = useLocales();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AuthGuard>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {sidebarOpen && <Sidebar onToggle={() => setSidebarOpen(false)} />}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AppBar position="sticky" color="inherit" elevation={1}>
            <Toolbar sx={{ gap: 2 }}>
              {/* Sidebar đang ẩn thì hiện nút mở lại */}
              {!sidebarOpen && (
                <IconButton onClick={() => setSidebarOpen(true)} aria-label={translate('menu.toggle')}>
                  <MenuIcon />
                </IconButton>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <LanguageSwitcher />
              {/* Đăng xuất nằm trong menu tài khoản ở chân Sidebar */}
            </Toolbar>
          </AppBar>
          {/* Nội dung tràn hết chiều ngang còn lại */}
          <Box component="main" sx={{ p: 3 }}>{children}</Box>
        </Box>
      </Box>
    </AuthGuard>
  );
}