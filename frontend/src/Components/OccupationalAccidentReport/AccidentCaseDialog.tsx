"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
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

const money = (value: string) => value.replace(/\D/g, "").slice(0, 19) || "0";
const intValue = (value: string, minimum = 0) =>
  Math.max(minimum, Math.min(2_147_483_647, Number(value) || 0));

interface AccidentCaseDialogProps {
  open: boolean;
  item: OccupationalAccidentCase | null;
  causes: AccidentCause[];
  injuryFactors: InjuryFactor[];
  occupations: Occupation[];
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

  const valid =
    Boolean(form.accidentDate) &&
    form.primaryCauseId > 0 &&
    form.injuryFactorId > 0 &&
    form.victimGroups.length > 0 &&
    form.victimGroups.every(
      (group) =>
        group.occupationId > 0 &&
        group.victimCount > 0 &&
        group.femaleCount <= group.victimCount &&
        group.deathCount + group.severeCount <= group.victimCount,
    );

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
            <TextField
              required
              size="small"
              type="date"
              label="Ngày xảy ra tai nạn"
              value={form.accidentDate}
              onChange={(event) => setField("accidentDate", event.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: minDate, max: maxDate },
              }}
            />
            <TextField
              required
              select
              size="small"
              label="Nguyên nhân xảy ra tai nạn"
              value={form.primaryCauseId || ""}
              onChange={(event) =>
                setField("primaryCauseId", Number(event.target.value))
              }
            >
              {causes.map((cause) => (
                <MenuItem key={cause.id} value={cause.id}>
                  {cause.causeCode} - {cause.causeName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              select
              size="small"
              label="Yếu tố gây chấn thương"
              value={form.injuryFactorId || ""}
              onChange={(event) =>
                setField("injuryFactorId", Number(event.target.value))
              }
            >
              {injuryFactors.map((factor) => (
                <MenuItem key={factor.id} value={factor.id}>
                  {factor.factorCode} - {factor.factorName}
                </MenuItem>
              ))}
            </TextField>
          </Box>

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
              <TextField
                required
                select
                size="small"
                label="Nghề nghiệp"
                value={group.occupationId || ""}
                onChange={(event) =>
                  updateGroup(index, {
                    occupationId: Number(event.target.value),
                  })
                }
              >
                {occupations.map((occupation) => (
                  <MenuItem key={occupation.id} value={occupation.id}>
                    {occupation.occupationCode} - {occupation.occupationName}
                  </MenuItem>
                ))}
              </TextField>
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
                value={form[key]}
                onChange={(event) => setField(key, money(event.target.value))}
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
