"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useSnackbar } from "notistack";
import useLocales from "@/Hooks/useLocales";
import { occupationApi, type Occupation } from "@/services/accidentCatalog";
import { getErrorMessage } from "@/services/user";
import OccupationParentTreeSelect from "./OccupationParentTreeSelect";

type OccupationForm = {
  occupationCode: string;
  occupationName: string;
  parentId: string;
  isActive: boolean;
};

const toForm = (occupation: Occupation | null): OccupationForm => ({
  occupationCode: occupation?.occupationCode ?? "",
  occupationName: occupation?.occupationName ?? "",
  parentId: occupation?.parentId ? String(occupation.parentId) : "",
  isActive: occupation?.isActive ?? true,
});

export default function OccupationFormDialog({
  open,
  occupation,
  rows,
  onClose,
  onSaved,
}: {
  open: boolean;
  occupation: Occupation | null;
  rows: Occupation[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(occupation);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<OccupationForm>({ defaultValues: toForm(null) });

  useEffect(() => {
    if (open) reset(toForm(occupation));
  }, [occupation, open, reset]);

  const parentOptions = useMemo(
    () => rows.filter((row) => row.level < 4 && (isEdit || row.isActive)),
    [isEdit, rows],
  );

  const onSubmit = async (values: OccupationForm) => {
    try {
      if (occupation) {
        await occupationApi.update(occupation.id, {
          occupationName: values.occupationName.trim(),
        });
        if (values.isActive !== occupation.isActive) {
          await occupationApi.updateStatus(occupation.id, values.isActive);
        }
      } else {
        const created = await occupationApi.create({
          occupationCode: values.occupationCode.trim(),
          occupationName: values.occupationName.trim(),
          parentId: values.parentId ? Number(values.parentId) : null,
        });
        if (!values.isActive) {
          await occupationApi.updateStatus(created.id, false);
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
            ? "accidentCatalog.editOccupation"
            : "accidentCatalog.addOccupation",
        )}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="occupation-form"
          spacing={2}
          sx={{ pt: 2 }}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Controller
            name="occupationCode"
            control={control}
            rules={
              isEdit
                ? {}
                : {
                    required,
                    pattern: {
                      value: /^\d{1,4}$/,
                      message: translate(
                        "accidentCatalog.invalidOccupationCode",
                      ),
                    },
                  }
            }
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={translate("accidentCatalog.occupationCode")}
                required
                disabled={isEdit}
                size="small"
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ??
                  translate("accidentCatalog.occupationCodeHint")
                }
                slotProps={{
                  htmlInput: { maxLength: 4, inputMode: "numeric" },
                }}
              />
            )}
          />
          <Controller
            name="occupationName"
            control={control}
            rules={{ required, maxLength: 255 }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={translate("accidentCatalog.occupationName")}
                required
                size="small"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { maxLength: 255 } }}
              />
            )}
          />
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <OccupationParentTreeSelect
                value={field.value}
                onChange={field.onChange}
                options={parentOptions}
                label={translate("accidentCatalog.parentOccupation")}
                noParentLabel={translate("accidentCatalog.noParentOccupation")}
                helperText={translate(
                  isEdit
                    ? "accidentCatalog.occupationParentImmutableHint"
                    : "accidentCatalog.parentOccupationHint",
                )}
                expandLabel={translate("accidentCatalog.expandOccupation")}
                collapseLabel={translate("accidentCatalog.collapseOccupation")}
                disabled={isEdit}
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
          form="occupation-form"
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
