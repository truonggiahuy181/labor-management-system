// src/Components/BulkActionBar.tsx
'use client';
import { Box, Button, IconButton, Paper, Slide, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import useLocales from '@/Hooks/useLocales';

// Thanh nổi góc dưới bên phải, hiện khi bảng có dòng đang được chọn
// Dùng lại được cho các màn hình danh sách khác (doanh nghiệp, kỳ báo cáo...)
export default function BulkActionBar({ count, deleting, onDelete, onClear }: {
  count: number;
  deleting?: boolean;
  onDelete: () => void;
  onClear: () => void;
}) {
  const { translate } = useLocales();

  return (
    <Slide direction="up" in={count > 0} mountOnEnter unmountOnExit>
      <Paper elevation={6} sx={{
        position: 'fixed', right: 24, bottom: 24, zIndex: 'snackbar',
        display: 'flex', alignItems: 'center', gap: 1.5, pr: 1, overflow: 'hidden', borderRadius: 1,
      }}>
        <Box sx={{ alignSelf: 'stretch', minWidth: 44, px: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'common.white', fontWeight: 700 }}>
          {count}
        </Box>
        <Typography variant="body2" sx={{ py: 1.25, mr: 1 }}>{translate('users.selected')}</Typography>
        <Button size="small" variant="contained" color="error" startIcon={<DeleteOutlinedIcon />} disabled={deleting} onClick={onDelete}>
          {translate('users.delete')}
        </Button>
        <IconButton size="small" onClick={onClear} aria-label={translate('users.clearSelection')}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Slide>
  );
}
