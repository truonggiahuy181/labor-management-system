"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  createFilterOptions,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AppDateField from "@/Components/AppDateField";
import type { InjuryFactor, Occupation } from "@/services/accidentCatalog";
import type {
  AccidentCaseBody,
  AccidentCause,
  AccidentVictimGroupBody,
} from "@/services/occupationalAccidentReport";
import { formatVnd, sanitizeVndInput } from "@/services/money";
import {
  createEmptyVictimGroup,
  getAccidentCaseErrors,
  type AccidentCaseConstraints,
} from "./accidentCaseValidation";

const intValue = (value: string) =>
  Math.max(0, Math.min(2_147_483_647, Number(value) || 0));
const causeFilter = createFilterOptions<AccidentCause>({
  stringify: (option) => `${option.causeCode} ${option.causeName}`,
  limit: 50,
});
const factorFilter = createFilterOptions<InjuryFactor>({
  stringify: (option) => `${option.factorCode} ${option.factorName}`,
  limit: 50,
});
const occupationFilter = createFilterOptions<Occupation>({
  stringify: (option) => `${option.occupationCode} ${option.occupationName}`,
  limit: 80,
});

export interface AccidentCaseFormProps extends AccidentCaseConstraints {
  value: AccidentCaseBody;
  causes: AccidentCause[];
  injuryFactors: InjuryFactor[];
  occupations: Occupation[];
  saving: boolean;
  showSaveAndNext?: boolean;
  initialAttempted?: boolean;
  onChange: (body: AccidentCaseBody) => void;
  onSave: (body: AccidentCaseBody, moveNext: boolean) => void;
  onCancel?: () => void;
  onInvalid?: () => void;
}

export default function AccidentCaseForm({
  value: form,
  causes,
  injuryFactors,
  occupations,
  totalEmployees,
  femaleEmployees,
  minDate,
  maxDate,
  saving,
  showSaveAndNext = false,
  initialAttempted = false,
  onChange,
  onSave,
  onCancel,
  onInvalid,
}: AccidentCaseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [attempted, setAttempted] = useState(initialAttempted);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = getAccidentCaseErrors(form, {
    totalEmployees,
    femaleEmployees,
    minDate,
    maxDate,
  });
  const fieldError = (key: string) =>
    attempted || touched[key] ? errors[key] : undefined;
  const errorProps = (key: string) => ({
    name: key,
    error: Boolean(fieldError(key)),
    helperText: fieldError(key),
  });
  const setField = <Key extends keyof AccidentCaseBody>(
    key: Key,
    value: AccidentCaseBody[Key],
  ) => onChange({ ...form, [key]: value });
  const updateGroup = (
    index: number,
    values: Partial<AccidentVictimGroupBody>,
  ) =>
    setField(
      "victimGroups",
      form.victimGroups.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...values } : group,
      ),
    );

  const save = (moveNext: boolean) => {
    if (saving) return;
    setAttempted(true);
    // Check the displayed date too: a partially typed date may not have an ISO value yet.
    if (
      Object.keys(errors).length ||
      formRef.current?.querySelector('[aria-invalid="true"]')
    ) {
      onInvalid?.();
      requestAnimationFrame(() => {
        const input = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        );
        input?.focus();
        input?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    onSave(form, moveNext);
  };

  return (
    <Box
      component="form"
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
      onBlurCapture={(event) => {
        const name =
          event.target instanceof HTMLInputElement ? event.target.name : "";
        if (name) setTouched((current) => ({ ...current, [name]: true }));
      }}
    >
      <Box
        component="fieldset"
        disabled={saving}
        sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            <AppDateField
              required
              label="Ngày xảy ra tai nạn"
              value={form.accidentDate}
              onChange={(value) => setField("accidentDate", value)}
              min={minDate}
              max={maxDate}
              disabled={saving}
              {...errorProps("accidentDate")}
            />
            <Autocomplete
              size="small"
              options={causes}
              value={
                causes.find((cause) => cause.id === form.primaryCauseId) ?? null
              }
              autoHighlight
              openOnFocus
              selectOnFocus
              disabled={saving}
              filterOptions={causeFilter}
              getOptionLabel={(option) =>
                `${option.causeCode} - ${option.causeName}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, option) =>
                setField("primaryCauseId", option?.id ?? 0)
              }
              slotProps={{ listbox: { style: { maxHeight: 320 } } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Nguyên nhân xảy ra tai nạn"
                  placeholder="Nhập mã hoặc tên để tìm"
                  {...errorProps("primaryCauseId")}
                />
              )}
            />
            <Autocomplete
              size="small"
              options={injuryFactors}
              value={
                injuryFactors.find(
                  (factor) => factor.id === form.injuryFactorId,
                ) ?? null
              }
              autoHighlight
              openOnFocus
              selectOnFocus
              disabled={saving}
              filterOptions={factorFilter}
              getOptionLabel={(option) =>
                `${option.factorCode} - ${option.factorName}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, option) =>
                setField("injuryFactorId", option?.id ?? 0)
              }
              slotProps={{ listbox: { style: { maxHeight: 320 } } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Yếu tố gây chấn thương"
                  placeholder="Nhập mã hoặc tên để tìm"
                  {...errorProps("injuryFactorId")}
                />
              )}
            />
          </Box>
          {attempted && Object.keys(errors).length > 0 && (
            <Alert severity="error">
              Vui lòng kiểm tra các trường được đánh dấu trong vụ tai nạn này.
            </Alert>
          )}
          <Divider />
          <Stack direction="row" sx={{ alignItems: "center" }}>
            <Typography sx={{ flex: 1, fontWeight: 700 }}>
              Nhóm nạn nhân
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={saving}
              onClick={() =>
                setField("victimGroups", [
                  ...form.victimGroups,
                  createEmptyVictimGroup(),
                ])
              }
            >
              Thêm nhóm
            </Button>
          </Stack>
          {fieldError("victimGroups") && (
            <Alert severity="error">{fieldError("victimGroups")}</Alert>
          )}
          {form.victimGroups.map((group, index) => (
            <Box
              key={index}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(220px, 2fr) repeat(4, minmax(90px, 1fr)) auto",
                },
                gap: 1.5,
                alignItems: "start",
                p: 1.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Autocomplete
                size="small"
                options={occupations}
                value={
                  occupations.find(
                    (occupation) => occupation.id === group.occupationId,
                  ) ?? null
                }
                autoHighlight
                openOnFocus
                selectOnFocus
                disabled={saving}
                filterOptions={occupationFilter}
                getOptionLabel={(option) =>
                  `${option.occupationCode} - ${option.occupationName}`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, option) =>
                  updateGroup(index, { occupationId: option?.id ?? 0 })
                }
                slotProps={{ listbox: { style: { maxHeight: 320 } } }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id} title={option.occupationName}>
                    <Typography noWrap>
                      {option.occupationCode} - {option.occupationName}
                    </Typography>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Nghề nghiệp"
                    placeholder="Nhập mã hoặc tên nghề"
                    {...errorProps(`victimGroups.${index}.occupationId`)}
                  />
                )}
              />
              {(
                [
                  ["victimCount", "Số nạn nhân", 1],
                  ["femaleCount", "Số nữ", 0],
                  ["deathCount", "Số người chết", 0],
                  ["severeCount", "Thương nặng", 0],
                ] as const
              ).map(([key, label, minimum]) => (
                <TextField
                  key={key}
                  required
                  size="small"
                  type="number"
                  label={label}
                  value={
                    key === "victimCount" && group[key] === 0 ? "" : group[key]
                  }
                  onChange={(event) =>
                    updateGroup(index, { [key]: intValue(event.target.value) })
                  }
                  slotProps={{
                    htmlInput: { min: minimum, max: 2_147_483_647, step: 1 },
                  }}
                  {...errorProps(`victimGroups.${index}.${key}`)}
                />
              ))}
              <IconButton
                color="error"
                disabled={saving || form.victimGroups.length === 1}
                onClick={() => {
                  setField(
                    "victimGroups",
                    form.victimGroups.filter(
                      (_, groupIndex) => groupIndex !== index,
                    ),
                  );
                  setTouched({});
                }}
                aria-label={`Xóa nhóm nạn nhân ${index + 1}`}
              >
                <DeleteIcon />
              </IconButton>
              <FormControlLabel
                sx={{ gridColumn: { md: "1 / -1" } }}
                control={
                  <Switch
                    checked={group.isUnderEnterpriseManagement}
                    disabled={saving}
                    onChange={(event) =>
                      updateGroup(index, {
                        isUnderEnterpriseManagement: event.target.checked,
                      })
                    }
                  />
                }
                label="Người lao động thuộc phạm vi quản lý của doanh nghiệp"
              />
            </Box>
          ))}
          <Divider />
          <Typography sx={{ fontWeight: 700 }}>Thiệt hại</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {(
              [
                ["medicalCostVnd", "Chi phí y tế"],
                ["salaryCostVnd", "Trả lương trong thời gian điều trị"],
                ["compensationCostVnd", "Bồi thường, trợ cấp"],
                ["propertyDamageVnd", "Thiệt hại tài sản"],
              ] as const
            ).map(([key, label]) => (
              <TextField
                key={key}
                required
                size="small"
                label={`${label} (VND)`}
                value={formatVnd(form[key])}
                onChange={(event) =>
                  setField(key, sanitizeVndInput(event.target.value))
                }
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
              />
            ))}
            <TextField
              required
              size="small"
              type="number"
              label="Tổng số ngày nghỉ vì tai nạn"
              value={form.lostWorkDays}
              onChange={(event) =>
                setField("lostWorkDays", intValue(event.target.value))
              }
              slotProps={{ htmlInput: { min: 0, max: 2_147_483_647, step: 1 } }}
              {...errorProps("lostWorkDays")}
            />
            <TextField
              size="small"
              label="Tổng số tiền chi phí (VND)"
              value={formatVnd(
                (
                  BigInt(form.medicalCostVnd || "0") +
                  BigInt(form.salaryCostVnd || "0") +
                  BigInt(form.compensationCostVnd || "0")
                ).toString(),
              )}
              slotProps={{ input: { readOnly: true } }}
            />
          </Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: "flex-end", flexWrap: "wrap", gap: 1 }}
          >
            {onCancel && (
              <Button onClick={onCancel} disabled={saving}>
                Hủy
              </Button>
            )}
            <Button
              type="submit"
              variant={showSaveAndNext ? "outlined" : "contained"}
              startIcon={<SaveOutlinedIcon />}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
            {showSaveAndNext && (
              <Button
                variant="contained"
                endIcon={<NavigateNextIcon />}
                disabled={saving}
                onClick={() => save(true)}
              >
                Lưu và sang vụ tiếp theo
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
