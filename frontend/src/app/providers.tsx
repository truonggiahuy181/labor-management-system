'use client';

import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import {SnackbarProvider} from 'notistack';
import theme from '@/theme';
import {AuthProvider} from '@/Hooks/useAuth';
import '@/locales/i18n';

// Đẩy toast xuống dưới hàng tiêu đề trang (nút Lưu / Huỷ) và nút đổi ngôn ngữ ở trang đăng nhập để không che chúng
const SNACKBAR_TOP_OFFSET = 72;

export default function Providers({children}: {children: React.ReactNode}) {

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalStyles styles={{ '.snackbar-top-right': { top: `${SNACKBAR_TOP_OFFSET}px !important` } }} />
            <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                classes={{ containerAnchorOriginTopRight: 'snackbar-top-right' }}
            >
                <AuthProvider>{children}</AuthProvider>
            </SnackbarProvider>
        </ThemeProvider>
    );
}