// src/theme/index.ts
'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: { primary: { main: '#1976d2' } },
  typography: { fontFamily: 'var(--font-sans), Roboto, Arial, sans-serif' },
});

export default theme;
