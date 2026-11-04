'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import { industryApi, type Industry } from '@/services/enterprise';
import { getErrorMessage } from '@/services/user';

type IndustryForm = {
  industryCode: string;
  industryName: string;
  parentId: string;
  isActive: boolean;
};

const toForm = (industry: Industry | null): IndustryForm => ({
  industryCode: industry?.industryCode ?? '',
  industryName: industry?.industryName ?? '',
  parentId: industry?.parentId ? String(industry.parentId) : '',
  isActive: industry?.isActive ?? true,
});

const descendantIds = (rows: Industry[], rootId: number) => {
  const descendants = new Set<number>();
  const pending = [rootId];
  while (pending.length) {
    const parentId = pending.pop();
    rows.forEach((row) => {
      if (row.parentId === parentId && !descendants.has(row.id)) {
        descendants.add(row.id);
        pending.push(row.id);
      }
    });
  }
  return descendants;
};

export default function IndustryFormDialog({ open, industry, rows, onClose, onSaved }: {
  open: boolean;
  industry: Industry | null;
  rows: Industry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!industry;
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<IndustryForm>({
    defaultValues: toForm(null),
  });

  useEffect(() => {
    if (open) reset(toForm(industry));
  }, [industry, open, reset]);

  const parentOptions = useMemo(() => {
    const blocked = industry ? descendantIds(rows, industry.id) : new Set<number>();
    return rows.filter((row) => (
      row.level < 4
      && row.id !== industry?.id
      && !blocked.has(row.id)
      && (row.isActive || row.id === industry?.parentId)
    ));
  }, [industry, rows]);

  const onSubmit = async (values: IndustryForm) => {
    const parentId = values.parentId ? Number(values.parentId) : null;
    const parent = parentId ? rows.find((row) => row.id === parentId) : null;
    const level = parent ? parent.level + 1 : 1;

    try {
      if (industry) {
        const body: Partial<Pick<Industry, 'industryName' | 'level' | 'parentId'>> = {
          industryName: values.industryName.trim(),
        };
        if (parentId !== industry.parentId) {
          body.parentId = parentId;
          body.level = level;
        }
        await industryApi.update(industry.id, body);
        if (values.isActive !== industry.isActive) {
          await industryApi.updateStatus(industry.id, values.isActive);
        }
      } else {
        const created = await industryApi.create({
          industryCode: values.industryCode.trim().toUpperCase(),
          industryName: values.industryName.trim(),
          level,
          parentId,
        });
        if (!values.isActive) await industryApi.updateStatus(created.id, false);
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
        {translate(isEdit ? 'catalogManagement.editIndustry' : 'catalogManagement.addIndustry')}
      </DialogTitle>
      <DialogContent>
        <Stack component="form" id="industry-form" spacing={2} sx={{ pt: 2 }} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="industryCode"
            control={control}
            rules={isEdit ? {} : {
              required,
              pattern: { value: /^[A-Z0-9][A-Z0-9_-]*$/, message: translate('catalogManagement.invalidCode') },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                label={translate('catalogManagement.industryCode')}
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
            name="industryName"
            control={control}
            rules={{ required, maxLength: 255 }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={translate('catalogManagement.industryName')}
                required
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { maxLength: 255 } }}
              />
            )}
          />
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <TextField {...field} select size="small" label={translate('catalogManagement.parentIndustry')}>
                <MenuItem value="">{translate('catalogManagement.noParent')}</MenuItem>
                {parentOptions.map((row) => (
                  <MenuItem key={row.id} value={String(row.id)}>
                    {`${'— '.repeat(row.level - 1)}${row.industryCode} - ${row.industryName}`}
                  </MenuItem>
                ))}
              </TextField>
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
        <Button type="submit" form="industry-form" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={isSubmitting}>
          {translate('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
