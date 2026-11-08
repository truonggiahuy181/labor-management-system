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
import { injuryTypeApi, type InjuryType } from "@/services/accidentCatalog";
import { getErrorMessage } from "@/services/user";
import InjuryTypeParentTreeSelect from "./InjuryTypeParentTreeSelect";

type InjuryTypeForm = {
  codeSegment: string;
  injuryTypeName: string;
  parentId: string;
  isActive: boolean;
};

const toForm = (injuryType: InjuryType | null): InjuryTypeForm => ({
  codeSegment: injuryType?.injuryTypeCode.slice(-1) ?? "",
  injuryTypeName: injuryType?.injuryTypeName ?? "",
  parentId: injuryType?.parentId ? String(injuryType.parentId) : "",
  isActive: injuryType?.isActive ?? true,
});

export default function InjuryTypeFormDialog({
  open,
  injuryType,
  rows,
  onClose,
  onSaved,
}: {
  open: boolean;
  injuryType: InjuryType | null;
  rows: InjuryType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(injuryType);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<InjuryTypeForm>({ defaultValues: toForm(null) });

  useEffect(() => {
    if (open) reset(toForm(injuryType));
  }, [injuryType, open, reset]);

  const parentOptions = useMemo(
    () => rows.filter((row) => row.level < 3 && (isEdit || row.isActive)),
    [isEdit, rows],
  );
  const parentId = useWatch({ control, name: "parentId" });
  const codeSegment = useWatch({ control, name: "codeSegment" });
  const selectedParent = useMemo(
    () =>
      parentId
        ? parentOptions.find((row) => row.id === Number(parentId))
        : undefined,
    [parentId, parentOptions],
  );
  const codePrefix = selectedParent?.injuryTypeCode ?? "";
  const fullCode = injuryType?.injuryTypeCode ?? `${codePrefix}${codeSegment}`;
  const newLevel = selectedParent ? selectedParent.level + 1 : 1;

  const onSubmit = async (values: InjuryTypeForm) => {
    try {
      if (injuryType) {
        await injuryTypeApi.update(injuryType.id, {
          injuryTypeName: values.injuryTypeName.trim(),
        });
        if (values.isActive !== injuryType.isActive) {
          await injuryTypeApi.updateStatus(injuryType.id, values.isActive);
        }
      } else {
        const created = await injuryTypeApi.create({
          codeSegment: values.codeSegment.trim(),
          injuryTypeName: values.injuryTypeName.trim(),
          parentId: values.parentId ? Number(values.parentId) : null,
        });
        if (!values.isActive) {
          await injuryTypeApi.updateStatus(created.id, false);
        }
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
            ? "accidentCatalog.editInjuryType"
            : "accidentCatalog.addInjuryType",
        )}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="injury-type-form"
          spacing={2}
          sx={{ pt: 2 }}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <InjuryTypeParentTreeSelect
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  if (!isEdit) {
                    setValue("codeSegment", "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
                options={parentOptions}
                label={translate("accidentCatalog.parentInjuryType")}
                noParentLabel={translate("accidentCatalog.noParentInjuryType")}
                helperText={translate(
                  isEdit
                    ? "accidentCatalog.parentImmutableHint"
                    : "accidentCatalog.parentInjuryTypeHint",
                )}
                expandLabel={translate("accidentCatalog.expandInjuryType")}
                collapseLabel={translate("accidentCatalog.collapseInjuryType")}
                disabled={isEdit}
              />
            )}
          />
          <Controller
            name="codeSegment"
            control={control}
            rules={
              isEdit
                ? {}
                : {
                    required,
                    pattern: {
                      value: /^\d$/,
                      message: translate(
                        "accidentCatalog.invalidInjuryTypeCode",
                      ),
                    },
                  }
            }
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={isEdit ? fullCode : field.value}
                onChange={(event) =>
                  field.onChange(event.target.value.replace(/\D/g, "").slice(0, 1))
                }
                label={translate("accidentCatalog.injuryTypeCode")}
                required
                disabled={isEdit}
                size="small"
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ??
                  translate("accidentCatalog.injuryTypeCodePreview", {
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
                  htmlInput: { maxLength: 1, inputMode: "numeric" },
                }}
              />
            )}
          />
          <Controller
            name="injuryTypeName"
            control={control}
            rules={{ required, maxLength: 255 }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={translate("accidentCatalog.injuryTypeName")}
                required
                size="small"
                error={Boolean(fieldState.error)}
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
          form="injury-type-form"
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
