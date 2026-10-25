// src/Components/UserProfile/AvatarCard.tsx
// Cột trái: ảnh đại diện + công tắc Kích hoạt. Không truyền onActiveChange thì công tắc bị khoá.
'use client';
import { Avatar, Card, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import useLocales from '@/Hooks/useLocales';
import { PROFILE_CARD_SX } from './options';

export default function AvatarCard({ avatarUrl, active, onActiveChange }: {
  avatarUrl?: string | null;
  active: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  const { translate } = useLocales();
  return (
    <Card sx={{ ...PROFILE_CARD_SX, width: { xs: '100%', md: 260 }, p: 3, flexShrink: 0 }}>
      {/* Tải ảnh: backend chưa có API upload, hiện chỉ hiển thị avatarUrl */}
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Avatar src={avatarUrl ?? undefined} sx={{ width: 120, height: 120, bgcolor: 'grey.100', color: 'text.secondary' }}>
          <Stack sx={{ alignItems: 'center' }}>
            <PhotoCameraOutlinedIcon />
            <Typography variant="caption">{translate('account.uploadAvatar')}</Typography>
          </Stack>
        </Avatar>
        <Typography variant="caption" color="text.secondary">{translate('account.avatarHint')}</Typography>
      </Stack>
      <FormControlLabel sx={{ mt: 3, ml: 0, width: '100%', justifyContent: 'space-between' }} labelPlacement="start"
        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{translate('account.active')}</Typography>}
        control={<Switch checked={active} disabled={!onActiveChange} onChange={(e) => onActiveChange?.(e.target.checked)} />} />
    </Card>
  );
}