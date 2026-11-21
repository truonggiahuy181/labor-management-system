'use client';

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import useLocales from '@/Hooks/useLocales';

export default function ActivationConfirmDialog({
  open,
  target,
  name,
  isActive,
  linked = false,
  processing = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  target: 'user' | 'enterprise';
  name: string;
  isActive: boolean;
  linked?: boolean;
  processing?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const { translate } = useLocales();
  const action = isActive ? 'activate' : 'deactivate';
  const paired = target === 'enterprise' || linked;
  return (
    <Dialog
      open={open}
      onClose={processing ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="activation-confirm-title"
      aria-describedby="activation-confirm-description"
    >
      <DialogTitle id="activation-confirm-title">
        {translate(`activation.${target}.${action}Title`)}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {name}
          </Typography>
          <Typography
            id="activation-confirm-description"
            variant="body2"
            color="text.secondary"
          >
            {translate(
              `activation.${paired ? 'paired' : 'account'}.${action}Hint`,
            )}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={processing}>
          {translate('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color={isActive ? 'primary' : 'error'}
          onClick={() => void onConfirm()}
          disabled={processing}
          startIcon={
            processing ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {translate(
            processing ? 'activation.processing' : `activation.${action}`,
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
