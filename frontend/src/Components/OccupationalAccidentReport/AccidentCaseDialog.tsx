"use client";

import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  createFilterOptions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import type { InjuryFactor, Occupation } from "@/services/accidentCatalog";
import type {
  AccidentCaseBody,
  AccidentCause,
  AccidentVictimGroupBody,
  OccupationalAccidentCase,
} from "@/services/occupationalAccidentReport";
import { formatVnd, sanitizeVndInput } from "@/services/money";
import AppDateField from "@/Components/AppDateField";

const EMPTY_GROUP: AccidentVictimGroupBody = {
  occupationId: 0,
  isUnderEnterpriseManagement: true,
  victimCount: 1,
  femaleCount: 0,
  deathCount: 0,
  severeCount: 0,
};

const EMPTY_CASE: AccidentCaseBody = {
  accidentDate: "",
  primaryCauseId: 0,
  injuryFactorId: 0,
  medicalCostVnd: "0",
  salaryCostVnd: "0",
  compensationCostVnd: "0",
  lostWorkDays: 0,
  propertyDamageVnd: "0",
  victimGroups: [{ ...EMPTY_GROUP }],
};

const toBody = (item: OccupationalAccidentCase | null): AccidentCaseBody =>
  item
    ? {
        accidentDate: item.accidentDate.slice(0, 10),
        primaryCauseId: item.accidentCause.id,
        injuryFactorId: item.injuryFactor.id,
        medicalCostVnd: item.medicalCostVnd,
        salaryCostVnd: item.salaryCostVnd,
        compensationCostVnd: item.compensationCostVnd,
        lostWorkDays: item.lostWorkDays,
        propertyDamageVnd: item.propertyDamageVnd,
        victimGroups: item.victimGroups.map((group) => ({
          occupationId: group.occupation.id,
          isUnderEnterpriseManagement: group.isUnderEnterpriseManagement,
          victimCount: group.victimCount,
          femaleCount: group.femaleCount,
          deathCount: group.deathCount,
          severeCount: group.severeCount,
        })),
      }
    : { ...EMPTY_CASE, victimGroups: [{ ...EMPTY_GROUP }] };

const intValue = (value: string, minimum = 0) =>
  Math.max(minimum, Math.min(2_147_483_647, Number(value) || 0));
const displayDate = (value: string) => value.split("-").reverse().join("/");

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

interface AccidentCaseDialogProps {
  open: boolean;
  item: OccupationalAccidentCase | null;
  causes: AccidentCause[];
  injuryFactors: InjuryFactor[];
  occupations: Occupation[];
  totalEmployees: number;
  femaleEmployees: number;
  minDate: string;
  maxDate: string;
  saving: boolean;
  onClose: () => void;
  onSave: (body: AccidentCaseBody) => void;
}

export default function AccidentCaseDialog({
  open,
  item,
  causes,
  injuryFactors,
  occupations,
  totalEmployees,
  femaleEmployees,
  minDate,
  maxDate,
  saving,
  onClose,
  onSave,
}: AccidentCaseDialogProps) {
  const [form, setForm] = useState<AccidentCaseBody>(() => toBody(item));

  const setField = <Key extends keyof AccidentCaseBody>(
    key: Key,
    value: AccidentCaseBody[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const updateGroup = (
    index: number,
    values: Partial<AccidentVictimGroupBody>,
  ) =>
    setForm((current) => ({
      ...current,
      victimGroups: current.victimGroups.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...values } : group,
      ),
    }));

  const removeGroup = (index: number) =>
    setForm((current) => ({
      ...current,
      victimGroups: current.victimGroups.filter(
        (_, groupIndex) => groupIndex !== index,
      ),
    }));

  const dateOutOfRange =
    Boolean(form.accidentDate) &&
    (form.accidentDate < minDate || form.accidentDate > maxDate);
  const invalidFemaleGroup = form.victimGroups.findIndex(
    (group) => group.femaleCount > group.victimCount,
  );
  const invalidInjuryGroup = form.victimGroups.findIndex(
    (group) => group.deathCount + group.severeCount > group.victimCount,
  );
  const managedVictims = form.victimGroups.reduce(
    (totals, group) => {
      if (group.isUnderEnterpriseManagement) {
        totals.victimCount += group.victimCount;
        totals.femaleCount += group.femaleCount;
      }
      return totals;
    },
    { victimCount: 0, femaleCount: 0 },
  );
  const managedVictimsExceedWorkforce =
    managedVictims.victimCount > totalEmployees;
  const managedFemaleVictimsExceedWorkforce =
    managedVictims.femaleCount > femaleEmployees;
  const selectedGroupKeys = form.victimGroups
    .filter((group) => group.occupationId > 0)
    .map(
      (group) => `${group.occupationId}:${group.isUnderEnterpriseManagement}`,
    );
  const hasDuplicateGroups =
    new Set(selectedGroupKeys).size !== selectedGroupKeys.length;
  const validationError = dateOutOfRange
    ? `Ngày xảy ra tai nạn phải từ ${displayDate(minDate)} đến ${displayDate(maxDate)}.`
    : invalidFemaleGroup >= 0
      ? `Nhóm nạn nhân ${invalidFemaleGroup + 1}: số nữ không được lớn hơn số nạn nhân.`
      : invalidInjuryGroup >= 0
        ? `Nhóm nạn nhân ${invalidInjuryGroup + 1}: tổng số người chết và bị thương nặng không được lớn hơn số nạn nhân.`
        : managedVictimsExceedWorkforce
          ? `Số nạn nhân thuộc quyền quản lý trong vụ này không được lớn hơn tổng số ${totalEmployees} lao động của cơ sở.`
          : managedFemaleVictimsExceedWorkforce
            ? `Số lao động nữ bị nạn thuộc quyền quản lý trong vụ này không được lớn hơn tổng số ${femaleEmployees} lao động nữ.`
            : hasDuplicateGroups
              ? "Không được lặp nghề nghiệp và phạm vi quản lý trong cùng một vụ tai nạn."
              : "";

  const valid =
    Boolean(form.accidentDate) &&
    !dateOutOfRange &&
    form.primaryCauseId > 0 &&
    form.injuryFactorId > 0 &&
    form.victimGroups.length > 0 &&
    form.victimGroups.every(
      (group) =>
        group.occupationId > 0 &&
        group.victimCount > 0 &&
        group.femaleCount <= group.victimCount &&
        group.deathCount + group.severeCount <= group.victimCount,
    ) &&
    !managedVictimsExceedWorkforce &&
    !managedFemaleVictimsExceedWorkforce &&
    !hasDuplicateGroups;
  const selectedCause =
    causes.find((cause) => cause.id === form.primaryCauseId) ?? null;
  const selectedFactor =
    injuryFactors.find((factor) => factor.id === form.injuryFactorId) ?? null;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        <Typography component="span" sx={{ flex: 1, fontWeight: 700 }}>
          {item ? "Cập nhật vụ tai nạn" : "Thêm vụ tai nạn"}
        </Typography>
        <IconButton onClick={onClose} disabled={saving} aria-label="Đóng">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
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
            />
            <Autocomplete
              size="small"
              options={causes}
              value={selectedCause}
              autoHighlight
              openOnFocus
              selectOnFocus
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
                />
              )}
            />
            <Autocomplete
              size="small"
              options={injuryFactors}
              value={selectedFactor}
              autoHighlight
              openOnFocus
              selectOnFocus
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
                />
              )}
            />
          </Box>

          {validationError && <Alert severity="error">{validationError}</Alert>}

          <Divider />
          <Stack direction="row" sx={{ alignItems: "center" }}>
            <Typography sx={{ flex: 1, fontWeight: 700 }}>
              Nhóm nạn nhân
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  victimGroups: [...current.victimGroups, { ...EMPTY_GROUP }],
                }))
              }
            >
              Thêm nhóm
            </Button>
          </Stack>

          {form.victimGroups.map((group, index) => (
            <Box
              key={index}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(250px, 2fr) repeat(4, minmax(100px, 1fr)) auto",
                },
                gap: 1.5,
                alignItems: "center",
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
                filterOptions={occupationFilter}
                getOptionLabel={(option) =>
                  `${option.occupationCode} - ${option.occupationName}`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, option) =>
                  updateGroup(index, {
                    occupationId: option?.id ?? 0,
                  })
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
                  value={group[key]}
                  onChange={(event) =>
                    updateGroup(index, {
                      [key]: intValue(event.target.value, minimum),
                    })
                  }
                  slotProps={{ htmlInput: { min: minimum } }}
                />
              ))}
              <IconButton
                color="error"
                disabled={form.victimGroups.length === 1}
                onClick={() => removeGroup(index)}
                aria-label="Xóa nhóm nạn nhân"
              >
                <DeleteIcon />
              </IconButton>
              <FormControlLabel
                sx={{ gridColumn: { md: "1 / -1" } }}
                control={
                  <Switch
                    checked={group.isUnderEnterpriseManagement}
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
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          disabled={saving || !valid}
          onClick={() => onSave(form)}
        >
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
