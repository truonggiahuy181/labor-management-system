'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import {
  getOccupationalAccidentSubmissionWindow,
  inferReportPeriodCode,
  inferReportTypeCode,
  reportPeriodApi,
  type ReportPeriod,
  type ReportPeriodBody,
} from '@/services/reportPeriod';
import { getErrorMessage } from '@/services/user';

type ReportPeriodForm = {
  reportName: string;
  reportYear: string;
  reportPeriod: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const toFormValues = (item: ReportPeriod | null): ReportPeriodForm => ({
  reportName: item?.reportName ?? '',
  reportYear: item ? String(item.reportYear) : '',
  reportPeriod: item?.reportPeriod ?? '',
  startDate: item?.startDate.slice(0, 10) ?? '',
  endDate: item?.endDate.slice(0, 10) ?? '',
  isActive: item?.isActive ?? true,
});

interface ReportPeriodFormDialogProps {
  open: boolean;
  item: ReportPeriod | null;
  reportNames: string[];
  reportPeriods: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ReportPeriodFormDialog({
  open,
  item,
  reportNames,
  reportPeriods,
  onClose,
  onSaved,
}: ReportPeriodFormDialogProps) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = item !== null;
  const nameOptions = useMemo(
    () => [...new Set([...reportNames, ...(item ? [item.reportName] : [])])],
    [item, reportNames],
  );
  const periodOptions = useMemo(
    () => [
      ...new Set([...reportPeriods, ...(item ? [item.reportPeriod] : [])]),
    ],
    [item, reportPeriods],
  );
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting },
  } = useForm<ReportPeriodForm>({ defaultValues: toFormValues(null) });
  const reportName = useWatch({ control, name: 'reportName' });
  const reportYear = useWatch({ control, name: 'reportYear' });
  const reportPeriod = useWatch({ control, name: 'reportPeriod' });
  const reportTypeCode = inferReportTypeCode(reportName);
  const periodCode = inferReportPeriodCode(reportPeriod, reportTypeCode);
  const statutoryWindow = getOccupationalAccidentSubmissionWindow(
    Number(reportYear),
    periodCode,
  );
  const statutoryWindowMessage = statutoryWindow
    ? translate(statutoryWindow.messageKey)
    : undefined;

  const validateStatutoryWindow = (value: string) =>
    !statutoryWindow ||
    (value >= statutoryWindow.firstSubmissionDate &&
      value < statutoryWindow.deadlineExclusive) ||
    statutoryWindowMessage;

  useEffect(() => {
    if (open) reset(toFormValues(item));
  }, [item, open, reset]);

  const onSubmit = async (values: ReportPeriodForm) => {
    const body: ReportPeriodBody = {
      reportName: values.reportName.trim(),
      reportYear: Number(values.reportYear),
      reportPeriod: values.reportPeriod.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      isActive: values.isActive,
    };

    try {
      if (item) await reportPeriodApi.update(item.id, body);
      else await reportPeriodApi.create(body);
      enqueueSnackbar(translate('common.saveSuccess'), { variant: 'success' });
      onSaved();
    } catch (error) {
      enqueueSnackbar(
        getErrorMessage(error, translate('common.unknownError')),
        { variant: 'error' },
      );
    }
  };

  const required = translate('common.required');

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: { borderRadius: 1, width: 560 },
        },
      }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.5 }}
      >
        <Typography
          component="span"
          sx={{ flex: 1, fontSize: 18, fontWeight: 700 }}
        >
          {translate(
            isEdit ? 'reportPeriods.editTitle' : 'reportPeriods.addTitle',
          )}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={translate('common.cancel')}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        <Box
          component="form"
          id="report-period-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Controller
            name="reportName"
            control={control}
            rules={{ required }}
            render={({ field, fieldState }) => (
              <Autocomplete
                freeSolo
                size="small"
                options={nameOptions}
                value={field.value || null}
                onChange={(_, value) => field.onChange(value ?? '')}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') field.onChange(value);
                }}
                sx={{ gridColumn: '1 / -1' }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label={translate('reportPeriods.reportName')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    slotProps={{
                      ...params.slotProps,
                      htmlInput: {
                        ...params.slotProps.htmlInput,
                        maxLength: 255,
                      },
                    }}
                  />
                )}
              />
            )}
          />

          <Controller
            name="reportYear"
            control={control}
            rules={{
              required,
              min: {
                value: 2000,
                message: translate('reportPeriods.invalidYear'),
              },
              max: {
                value: 2100,
                message: translate('reportPeriods.invalidYear'),
              },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                required
                size="small"
                type="number"
                label={translate('reportPeriods.reportYear')}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { min: 2000, max: 2100 } }}
              />
            )}
          />

          <Controller
            name="reportPeriod"
            control={control}
            rules={{
              required,
              validate: (value) =>
                inferReportTypeCode(getValues('reportName')) !==
                  'OCCUPATIONAL_ACCIDENT' ||
                inferReportPeriodCode(value, 'OCCUPATIONAL_ACCIDENT') !==
                  'CUSTOM' ||
                translate('reportPeriods.invalidOccupationalAccidentPeriod'),
            }}
            render={({ field, fieldState }) => (
              <Autocomplete
                freeSolo
                size="small"
                options={periodOptions}
                value={field.value || null}
                onChange={(_, value) => field.onChange(value ?? '')}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') field.onChange(value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label={translate('reportPeriods.reportPeriod')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    slotProps={{
                      ...params.slotProps,
                      htmlInput: {
                        ...params.slotProps.htmlInput,
                        maxLength: 100,
                      },
                    }}
                  />
                )}
              />
            )}
          />

          <Controller
            name="startDate"
            control={control}
            rules={{ required, validate: validateStatutoryWindow }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                required
                size="small"
                type="date"
                label={translate('reportPeriods.startDate')}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: statutoryWindow
                    ? {
                        min: statutoryWindow.firstSubmissionDate,
                        max: statutoryWindow.lastSubmissionDate,
                      }
                    : undefined,
                }}
              />
            )}
          />

          <Controller
            name="endDate"
            control={control}
            rules={{
              required,
              validate: (value) =>
                ((!getValues('startDate') || value >= getValues('startDate')) &&
                  validateStatutoryWindow(value)) ||
                translate('reportPeriods.invalidDateRange'),
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                required
                size="small"
                type="date"
                label={translate('reportPeriods.endDate')}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? statutoryWindowMessage}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: statutoryWindow
                    ? {
                        min: statutoryWindow.firstSubmissionDate,
                        max: statutoryWindow.lastSubmissionDate,
                      }
                    : undefined,
                }}
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
                label={translate('reportPeriods.status')}
                value={String(field.value)}
                onChange={(event) =>
                  field.onChange(event.target.value === 'true')
                }
                sx={{ gridColumn: '1 / -1' }}
              >
                <MenuItem value="true">
                  {translate('reportPeriods.active')}
                </MenuItem>
                <MenuItem value="false">
                  {translate('reportPeriods.inactive')}
                </MenuItem>
              </TextField>
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button
          type="submit"
          form="report-period-form"
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          disabled={isSubmitting}
        >
          {translate('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
