"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useSnackbar } from "notistack";
import useLocales from "@/Hooks/useLocales";
import AppDateField from "@/Components/AppDateField";
import SearchableSelectField from "@/Components/SearchableSelectField";
import {
  getOccupationalAccidentSubmissionWindow,
  reportPeriodApi,
  type ReportPeriod,
  type ReportPeriodBody,
  type ReportPeriodCode,
  type ReportTypeCode,
} from "@/services/reportPeriod";
import { notBlank } from "@/services/text";
import { getErrorMessage } from "@/services/user";

type ReportPeriodForm = {
  reportName: string;
  reportYear: string;
  reportTypeCode: ReportTypeCode;
  periodCode: ReportPeriodCode;
  submissionStartDate: string;
  submissionEndDate: string;
  isActive: boolean;
};

const toFormValues = (item: ReportPeriod | null): ReportPeriodForm => ({
  reportName: item?.reportName ?? "Báo cáo tai nạn lao động",
  reportYear: item ? String(item.reportYear) : String(new Date().getFullYear()),
  reportTypeCode: item?.reportTypeCode ?? "OCCUPATIONAL_ACCIDENT",
  periodCode: item?.periodCode ?? "FIRST_HALF",
  submissionStartDate: item?.submissionStartDate.slice(0, 10) ?? "",
  submissionEndDate: item?.submissionEndDate.slice(0, 10) ?? "",
  isActive: item?.isActive ?? true,
});

interface ReportPeriodFormDialogProps {
  open: boolean;
  item: ReportPeriod | null;
  reportNames: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ReportPeriodFormDialog({
  open,
  item,
  reportNames,
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
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm<ReportPeriodForm>({ defaultValues: toFormValues(null) });
  const reportYear = useWatch({ control, name: "reportYear" });
  const reportTypeCode = useWatch({ control, name: "reportTypeCode" });
  const periodCode = useWatch({ control, name: "periodCode" });
  const statutoryWindow =
    reportTypeCode === "OCCUPATIONAL_ACCIDENT"
      ? getOccupationalAccidentSubmissionWindow(Number(reportYear), periodCode)
      : null;
  const statutoryWindowMessage = statutoryWindow
    ? translate(statutoryWindow.messageKey)
    : undefined;
  const statutoryStartDate = statutoryWindow?.firstSubmissionDate;
  const statutoryEndDate = statutoryWindow?.lastSubmissionDate;

  useEffect(() => {
    if (open) reset(toFormValues(item));
  }, [item, open, reset]);

  useEffect(() => {
    if (!open || !statutoryStartDate || !statutoryEndDate) return;
    const keepsExistingWindow =
      item !== null &&
      Number(reportYear) === item.reportYear &&
      reportTypeCode === item.reportTypeCode &&
      periodCode === item.periodCode &&
      getValues("submissionStartDate") ===
        item.submissionStartDate.slice(0, 10) &&
      getValues("submissionEndDate") === item.submissionEndDate.slice(0, 10);
    if (keepsExistingWindow) return;
    setValue("submissionStartDate", statutoryStartDate, {
      shouldValidate: true,
    });
    setValue("submissionEndDate", statutoryEndDate, {
      shouldValidate: true,
    });
  }, [
    getValues,
    item,
    open,
    periodCode,
    reportTypeCode,
    reportYear,
    setValue,
    statutoryStartDate,
    statutoryEndDate,
  ]);

  const onSubmit = async (values: ReportPeriodForm) => {
    const body: ReportPeriodBody = {
      reportName: values.reportName.trim(),
      reportYear: Number(values.reportYear),
      reportTypeCode: values.reportTypeCode,
      periodCode: values.periodCode,
      submissionStartDate: values.submissionStartDate,
      submissionEndDate: values.submissionEndDate,
      isActive: values.isActive,
    };

    try {
      if (item) await reportPeriodApi.update(item.id, body);
      else await reportPeriodApi.create(body);
      enqueueSnackbar(translate("common.saveSuccess"), { variant: "success" });
      onSaved();
    } catch (error) {
      enqueueSnackbar(
        getErrorMessage(error, translate("common.unknownError")),
        { variant: "error" },
      );
    }
  };

  const required = translate("common.required");
  const validateStatutoryWindow = (value: string) =>
    !statutoryWindow ||
    (value >= statutoryWindow.firstSubmissionDate &&
      value < statutoryWindow.deadlineExclusive) ||
    statutoryWindowMessage;

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", px: 2.5, py: 1.5 }}
      >
        <Typography
          component="span"
          sx={{ flex: 1, fontSize: 18, fontWeight: 700 }}
        >
          {translate(
            isEdit ? "reportPeriods.editTitle" : "reportPeriods.addTitle",
          )}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={translate("common.cancel")}
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
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Controller
            name="reportName"
            control={control}
            rules={{
              required,
              validate: (value) => notBlank(value) || required,
              maxLength: {
                value: 255,
                message: translate("common.maxLength", { max: 255 }),
              },
            }}
            render={({ field, fieldState }) => (
              <Autocomplete
                freeSolo
                size="small"
                options={nameOptions}
                value={field.value || null}
                onChange={(_, value) => field.onChange(value ?? "")}
                onInputChange={(_, value, reason) =>
                  reason === "input" && field.onChange(value)
                }
                sx={{ gridColumn: "1 / -1" }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label={translate("reportPeriods.reportName")}
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
            name="reportTypeCode"
            control={control}
            render={({ field }) => (
              <SearchableSelectField
                required
                label="Loại báo cáo"
                value={field.value}
                options={[
                  {
                    value: "OCCUPATIONAL_ACCIDENT",
                    label: "Báo cáo tai nạn lao động",
                  },
                  { value: "OTHER", label: "Báo cáo khác" },
                ]}
                onChange={(selectedValue) => {
                  const value = selectedValue as ReportTypeCode;
                  field.onChange(value);
                  setValue(
                    "periodCode",
                    value === "OCCUPATIONAL_ACCIDENT" ? "FIRST_HALF" : "CUSTOM",
                  );
                }}
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
                message: translate("reportPeriods.invalidYear"),
              },
              max: {
                value: 2100,
                message: translate("reportPeriods.invalidYear"),
              },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                required
                size="small"
                type="number"
                label={translate("reportPeriods.reportYear")}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { min: 2000, max: 2100 } }}
              />
            )}
          />

          <Controller
            name="periodCode"
            control={control}
            rules={{ required }}
            render={({ field }) => (
              <SearchableSelectField
                required
                label={translate("reportPeriods.reportPeriod")}
                value={field.value}
                options={
                  reportTypeCode === "OCCUPATIONAL_ACCIDENT"
                    ? [
                        { value: "FIRST_HALF", label: "6 tháng đầu năm" },
                        { value: "ANNUAL", label: "Cả năm" },
                      ]
                    : [{ value: "CUSTOM", label: "Kỳ tùy chỉnh" }]
                }
                onChange={(value) => field.onChange(value as ReportPeriodCode)}
              />
            )}
          />

          <Controller
            name="submissionStartDate"
            control={control}
            rules={{ required, validate: validateStatutoryWindow }}
            render={({ field, fieldState }) => (
              <AppDateField
                required
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                name={field.name}
                label={translate("reportPeriods.startDate")}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                min={statutoryWindow?.firstSubmissionDate}
                max={statutoryWindow?.lastSubmissionDate}
              />
            )}
          />

          <Controller
            name="submissionEndDate"
            control={control}
            rules={{
              required,
              validate: (value) =>
                ((!getValues("submissionStartDate") ||
                  value >= getValues("submissionStartDate")) &&
                  validateStatutoryWindow(value)) ||
                translate("reportPeriods.invalidDateRange"),
            }}
            render={({ field, fieldState }) => (
              <AppDateField
                required
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                name={field.name}
                label={translate("reportPeriods.endDate")}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? statutoryWindowMessage}
                min={statutoryWindow?.firstSubmissionDate}
                max={statutoryWindow?.lastSubmissionDate}
              />
            )}
          />

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <SearchableSelectField
                label={translate("reportPeriods.status")}
                value={String(field.value)}
                options={[
                  { value: "true", label: translate("reportPeriods.active") },
                  {
                    value: "false",
                    label: translate("reportPeriods.inactive"),
                  },
                ]}
                onChange={(value) => field.onChange(value === "true")}
                sx={{ gridColumn: "1 / -1" }}
              />
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
          {translate("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
