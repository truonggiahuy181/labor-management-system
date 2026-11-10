"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useSnackbar } from "notistack";
import useLocales from "@/Hooks/useLocales";
import SearchableSelectField from "@/Components/SearchableSelectField";
import { injuryFactorApi, type InjuryFactor } from "@/services/accidentCatalog";
import { notBlank, startsWithLetterOrNumber } from "@/services/text";
import { getErrorMessage } from "@/services/user";

type InjuryFactorForm = {
  factorCode: string;
  factorName: string;
  isActive: boolean;
};

const toForm = (injuryFactor: InjuryFactor | null): InjuryFactorForm => ({
  factorCode: injuryFactor?.factorCode ?? "",
  factorName: injuryFactor?.factorName ?? "",
  isActive: injuryFactor?.isActive ?? true,
});

export default function InjuryFactorFormDialog({
  open,
  injuryFactor,
  onClose,
  onSaved,
}: {
  open: boolean;
  injuryFactor: InjuryFactor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(injuryFactor);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<InjuryFactorForm>({ defaultValues: toForm(null) });

  useEffect(() => {
    if (open) reset(toForm(injuryFactor));
  }, [injuryFactor, open, reset]);

  const onSubmit = async (values: InjuryFactorForm) => {
    try {
      if (injuryFactor) {
        await injuryFactorApi.update(injuryFactor.id, {
          factorCode: values.factorCode.trim(),
          factorName: values.factorName.trim(),
        });
        if (values.isActive !== injuryFactor.isActive) {
          await injuryFactorApi.updateStatus(injuryFactor.id, values.isActive);
        }
      } else {
        await injuryFactorApi.create({
          factorCode: values.factorCode.trim(),
          factorName: values.factorName.trim(),
          isActive: values.isActive,
        });
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
            ? "accidentCatalog.editInjuryFactor"
            : "accidentCatalog.addInjuryFactor",
        )}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="injury-factor-form"
          spacing={2}
          sx={{ pt: 2 }}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Controller
            name="factorCode"
            control={control}
            rules={{
              required,
              validate: {
                notBlank: (value) => notBlank(value) || required,
                validStart: (value) =>
                  startsWithLetterOrNumber(value) ||
                  translate("common.invalidNameStart"),
              },
              maxLength: {
                value: 50,
                message: translate("common.maxLength", { max: 50 }),
              },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={translate("accidentCatalog.injuryFactorCode")}
                required
                size="small"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { maxLength: 50 } }}
              />
            )}
          />
          <Controller
            name="factorName"
            control={control}
            rules={{
              required,
              validate: {
                notBlank: (value) => notBlank(value) || required,
                validStart: (value) =>
                  startsWithLetterOrNumber(value) ||
                  translate("common.invalidNameStart"),
              },
              maxLength: {
                value: 255,
                message: translate("common.maxLength", { max: 255 }),
              },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={translate("accidentCatalog.injuryFactorName")}
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
              <SearchableSelectField
                label={translate("catalogManagement.status")}
                value={String(field.value)}
                onChange={(value) => field.onChange(value === "true")}
                options={[
                  {
                    value: "true",
                    label: translate("catalogManagement.inUse"),
                  },
                  {
                    value: "false",
                    label: translate("catalogManagement.notInUse"),
                  },
                ]}
              />
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
          form="injury-factor-form"
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
