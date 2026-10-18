import Image from 'next/image';
import { Box, Button, Container, Stack, Typography } from '@mui/material';

export default function Home() {
  return (
    <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Stack spacing={4} sx={{ py: 8 }}>
        <Image src="/next.svg" alt="Next.js logo" width={100} height={20} priority />

        <Typography variant="h4" fontWeight={600}>
          To get started, edit the{' '}
          <Box component="code" sx={{ px: 0.75, borderRadius: 1, bgcolor: 'action.hover', fontFamily: 'monospace' }}>
            page.tsx
          </Box>{' '}
          file.
        </Typography>

        <Typography color="text.secondary">
          Trang đã dùng MUI. Sửa nội dung này để bắt đầu.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="contained" href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
            Documentation
          </Button>
          <Button variant="outlined" href="https://mui.com/material-ui/getting-started/" target="_blank" rel="noopener noreferrer">
            MUI docs
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}