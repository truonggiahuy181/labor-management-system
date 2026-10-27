'use client';
import { Button, Card, Typography } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import useLocales from '@/Hooks/useLocales';
import { PROFILE_CARD_SX } from './options';

export default function ProfileHeader({ onCancel, cancelDisabled, saveDisabled }: {
  onCancel: () => void;
  cancelDisabled?: boolean;
  saveDisabled?: boolean;
}) {
  const { translate } = useLocales();
  return (
    <Card elevation={1} sx={{ ...PROFILE_CARD_SX, px: 3, py: 1.5, display: 'flex', alignItems: 'center' }}>
      <Typography sx={{ flex: 1, fontWeight: 700 }}>{translate('account.detail')}</Typography>
      <Button disabled={cancelDisabled} onClick={onCancel}>{translate('common.cancel')}</Button>
      <Button type="submit" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={saveDisabled}>
        {translate('common.save')}
      </Button>
    </Card>
  );
}