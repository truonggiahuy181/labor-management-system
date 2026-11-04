'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import { businessTypeApi, type BusinessType } from '@/services/enterprise';
import { getErrorMessage } from '@/services/user';

type BusinessTypeForm = {
  typeCode: string;
  typeName: string;
  isActive: boolean;
};

const toForm = (businessType: BusinessType | null): BusinessTypeForm => ({
  typeCode: businessType?.typeCode ?? '',
  typeName: businessType?.typeName ?? '',
  isActive: businessType?.isActive ?? true,
});

export default function BusinessTypeFormDialog({ open, businessType, onClose, onSaved }: {
  open: boolean;
  businessType: BusinessType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!businessType;
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<BusinessTypeForm>({
    defaultValues: toForm(null),
  });

  useEffect(() => {
    if (open) reset(toForm(businessType));
  }, [businessType, open, reset]);

  const onSubmit = async (values: BusinessTypeForm) => {
    try {
      if (businessType) {
        await businessTypeApi.update(businessType.id, { typeName: values.typeName.trim() });
        if (values.isActive !== businessType.isActive) {
          await businessTypeApi.updateStatus(businessType.id, values.isActive);
        }
      } else {
        const created = await businessTypeApi.create({
          typeCode: values.typeCode.trim().toUpperCase(),
          typeName: values.typeName.trim(),
        });
        if (!values.isActive) await businessTypeApi.updateStatus(created.id, false);
      }
      enqueueSnackbar(translate('common.saveSuccess'), { variant: 'success' });
      onSaved();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, translate('common.unknownError')), { variant: 'error' });
    }
  };

  const required = translate('common.required');

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'common.white', fontWeight: 700 }}>
        {translate(isEdit ? 'catalogManagement.editBusinessType' : 'catalogManagement.addBusinessType')}
      </DialogTitle>
      <DialogContent>
        <Stack component="form" id="business-type-form" spacing={2} sx={{ pt: 2 }} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="typeCode"
            control={control}
            rules={isEdit ? {} : {
              required,
              pattern: { value: /^[A-Z0-9][A-Z0-9_-]*$/, message: translate('catalogManagement.invalidCode') },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                label={translate('catalogManagement.typeCode')}
                required
                disabled={isEdit}
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { maxLength: 50 } }}
              />
            )}
          />
          <Controller
            name="typeName"
            control={control}
            rules={{ required, maxLength: 255 }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={translate('catalogManagement.typeName')}
                required
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { maxLength: 255 } }}
              />
            )}
          />
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <TextField
                select
                size="small"
                label={translate('catalogManagement.status')}
                value={String(field.value)}
                onChange={(event) => field.onChange(event.target.value === 'true')}
              >
                <MenuItem value="true">{translate('catalogManagement.inUse')}</MenuItem>
                <MenuItem value="false">{translate('catalogManagement.notInUse')}</MenuItem>
              </TextField>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>{translate('common.cancel')}</Button>
        <Button type="submit" form="business-type-form" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={isSubmitting}>
          {translate('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
