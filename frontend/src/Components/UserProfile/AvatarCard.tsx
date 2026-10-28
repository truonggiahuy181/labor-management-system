// src/Components/UserProfile/AvatarCard.tsx
// Cột trái: ảnh đại diện + công tắc Kích hoạt. Không truyền onActiveChange thì công tắc bị khoá.
'use client';
import { type ChangeEvent } from 'react';
import { Avatar, ButtonBase, Card, CircularProgress, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import { PROFILE_CARD_SX } from './options';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const AVATAR_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export default function AvatarCard({ avatarUrl, active, onActiveChange, onAvatarUpload, isUploadingAvatar = false }: {
  avatarUrl?: string | null;
  active: boolean;
  onActiveChange?: (active: boolean) => void;
  onAvatarUpload?: (file: File) => void | Promise<void>;
  isUploadingAvatar?: boolean;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!AVATAR_CONTENT_TYPES.has(file.type)) {
      enqueueSnackbar(translate('account.avatarInvalidType'), { variant: 'warning' });
      input.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      enqueueSnackbar(translate('account.avatarTooLarge'), { variant: 'warning' });
      input.value = '';
      return;
    }

    try {
      await onAvatarUpload?.(file);
    } finally {
      input.value = '';
    }
  };

  return (
    <Card sx={{ ...PROFILE_CARD_SX, width: { xs: '100%', md: 260 }, p: 3, flexShrink: 0 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <ButtonBase component="label" disabled={!onAvatarUpload || isUploadingAvatar}
          aria-label={translate('account.uploadAvatar')} sx={{ borderRadius: '50%' }}>
          <Avatar src={avatarUrl ?? undefined} sx={{ width: 120, height: 120, bgcolor: 'grey.100', color: 'text.secondary' }}>
            {isUploadingAvatar ? <CircularProgress size={30} /> : (
              <Stack sx={{ alignItems: 'center' }}>
                <PhotoCameraOutlinedIcon />
                <Typography variant="caption">{translate('account.uploadAvatar')}</Typography>
              </Stack>
            )}
          </Avatar>
          <input hidden disabled={!onAvatarUpload || isUploadingAvatar} type="file"
            accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarChange} />
        </ButtonBase>
        <Typography variant="caption" color="text.secondary">{translate('account.avatarHint')}</Typography>
      </Stack>
      <FormControlLabel sx={{ mt: 3, ml: 0, width: '100%', justifyContent: 'space-between' }} labelPlacement="start"
        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{translate('account.active')}</Typography>}
        control={<Switch checked={active} disabled={!onActiveChange} onChange={(e) => onActiveChange?.(e.target.checked)} />} />
    </Card>
  );
}
