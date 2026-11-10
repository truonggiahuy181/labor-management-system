// src/app/layout.tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';
// Roboto tự host (có subset tiếng Việt) thay cho next/font/google: Google Fonts có lúc trả URL dạng
// /l/font?kit=…&skey=… và Turbopack không xử lý được dấu & trong đó → lỗi "queries have exactly one entry"
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Theme MUI dùng var(--font-sans) → khai báo trên <body> như next/font từng làm
const FONT_VARS = { '--font-sans': "'Roboto'" } as React.CSSProperties;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body style={FONT_VARS}>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}