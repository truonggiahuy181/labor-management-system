"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useSnackbar } from "notistack";
import useLocales from "@/Hooks/useLocales";
import { industryApi, type Industry } from "@/services/enterprise";
import { getErrorMessage } from "@/services/user";
import IndustryParentTreeSelect from "./IndustryParentTreeSelect";

type IndustryForm = {
  industryCode: string;
  industryName: string;
  parentId: string;
  isActive: boolean;
};

const toForm = (industry: Industry | null): IndustryForm => ({
  industryCode: industry?.industryCode ?? "",
  industryName: industry?.industryName ?? "",
  parentId: industry?.parentId ? String(industry.parentId) : "",
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

export default function IndustryFormDialog({
  open,
  industry,
  rows,
  onClose,
  onSaved,
}: {
  open: boolean;
  industry: Industry | null;
  rows: Industry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!industry;
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<IndustryForm>({
    defaultValues: toForm(null),
  });

  useEffect(() => {
    if (open) reset(toForm(industry));
  }, [industry, open, reset]);

  const parentOptions = useMemo(() => {
    const blocked = industry
      ? descendantIds(rows, industry.id)
      : new Set<number>();
    return rows.filter(
      (row) =>
        row.level < 4 &&
        row.id !== industry?.id &&
        !blocked.has(row.id) &&
        (row.isActive || row.id === industry?.parentId),
    );
  }, [industry, rows]);
  const parentId = useWatch({ control, name: "parentId" });
  const industryCode = useWatch({ control, name: "industryCode" });
  const selectedParent = useMemo(
    () =>
      parentId
        ? parentOptions.find((row) => row.id === Number(parentId))
        : undefined,
    [parentId, parentOptions],
  );
  const newLevel = selectedParent ? selectedParent.level + 1 : 1;
  const codePrefix = newLevel >= 3 ? (selectedParent?.industryCode ?? "") : "";
  const codeLength = newLevel === 2 ? 2 : 1;
  const fullCode = industry?.industryCode ?? `${codePrefix}${industryCode}`;
  const codePattern =
    newLevel === 1 ? /^[A-V]$/ : newLevel === 2 ? /^\d{2}$/ : /^\d$/;
  const codeErrorKey =
    newLevel === 1
      ? "catalogManagement.invalidIndustryRootCode"
      : newLevel === 2
        ? "catalogManagement.invalidIndustryLevelTwoCode"
        : "catalogManagement.invalidIndustryChildCode";

  const onSubmit = async (values: IndustryForm) => {
    const parentId = values.parentId ? Number(values.parentId) : null;

    try {
      if (industry) {
        const body: Partial<Pick<Industry, "industryName" | "parentId">> = {
          industryName: values.industryName.trim(),
        };
        if (parentId !== industry.parentId) {
          body.parentId = parentId;
        }
        await industryApi.update(industry.id, body);
        if (values.isActive !== industry.isActive) {
          await industryApi.updateStatus(industry.id, values.isActive);
        }
      } else {
        const created = await industryApi.create({
          industryCode: `${codePrefix}${values.industryCode.trim().toUpperCase()}`,
          industryName: values.industryName.trim(),
          parentId,
        });
        if (!values.isActive) await industryApi.updateStatus(created.id, false);
      }
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

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle
        sx={{ bgcolor: "primary.main", color: "common.white", fontWeight: 700 }}
      >
        {translate(
          isEdit
            ? "catalogManagement.editIndustry"
            : "catalogManagement.addIndustry",
        )}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="industry-form"
          spacing={2}
          sx={{ pt: 2 }}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <IndustryParentTreeSelect
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  if (!isEdit) {
                    setValue("industryCode", "", {
                      shouldDirty: true,
                      shouldValidate: false,
                    });
                  }
                }}
                options={parentOptions}
                label={translate("catalogManagement.parentIndustry")}
                noParentLabel={translate("catalogManagement.noParent")}
                helperText={translate("catalogManagement.parentIndustryHint")}
                expandLabel={translate("catalogManagement.expandIndustry")}
                collapseLabel={translate("catalogManagement.collapseIndustry")}
              />
            )}
          />
          <Controller
            name="industryCode"
            control={control}
            rules={
              isEdit
                ? {}
                : {
                    required,
                    pattern: {
                      value: codePattern,
                      message: translate(codeErrorKey),
                    },
                  }
            }
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={isEdit ? fullCode : field.value}
                onChange={(event) => {
                  const nextValue = event.target.value.toUpperCase();
                  field.onChange(
                    newLevel > 1
                      ? nextValue.replace(/\D/g, "").slice(0, codeLength)
                      : nextValue.replace(/[^A-V]/g, "").slice(0, 1),
                  );
                }}
                label={translate("catalogManagement.industryCode")}
                required
                disabled={isEdit}
                size="small"
                error={!!fieldState.error}
                helperText={
                  fieldState.error?.message ??
                  translate("catalogManagement.industryCodePreview", {
                    code: fullCode || "—",
                    level: newLevel,
                  })
                }
                slotProps={{
                  input: {
                    startAdornment:
                      !isEdit && codePrefix ? (
                        <InputAdornment position="start">
                          {codePrefix}
                        </InputAdornment>
                      ) : undefined,
                  },
                  htmlInput: {
                    maxLength: codeLength,
                    inputMode: newLevel > 1 ? "numeric" : "text",
                  },
                }}
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
                label={translate("catalogManagement.industryName")}
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
                label={translate("catalogManagement.status")}
                value={String(field.value)}
                onChange={(event) =>
                  field.onChange(event.target.value === "true")
                }
              >
                <MenuItem value="true">
                  {translate("catalogManagement.inUse")}
                </MenuItem>
                <MenuItem value="false">
                  {translate("catalogManagement.notInUse")}
                </MenuItem>
              </TextField>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          {translate("common.cancel")}
        </Button>
        <Button
          type="submit"
          form="industry-form"
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
