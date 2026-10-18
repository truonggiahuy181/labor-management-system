'use client';

import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {SnackbarProvider} from 'notistack';
import theme from '@/theme';
import {AuthProvider} from '@/Hooks/useAuth';
import '@/locales/i18n';

export default function Providers({children}: {children: React.ReactNode}) {

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <AuthProvider>{children}</AuthProvider>
            </SnackbarProvider>
        </ThemeProvider>
    );
}