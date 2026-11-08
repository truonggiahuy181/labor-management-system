"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, TextField, Typography } from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import type {
  Article39SummaryBody,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";

type Article39CountKey =
  | "totalCases"
  | "fatalCases"
  | "multiVictimCases"
  | "victimCount"
  | "femaleCount"
  | "deathCount"
  | "severeCount"
  | "unmanagedVictimCount"
  | "unmanagedFemaleCount"
  | "unmanagedDeathCount"
  | "unmanagedSevereCount"
  | "lostWorkDays";

type Article39MoneyKey =
  | "medicalCostVnd"
  | "salaryCostVnd"
  | "compensationCostVnd"
  | "propertyDamageVnd";

const COUNT_FIELDS: Array<[Article39CountKey, string]> = [
  ["totalCases", "Tổng số vụ"],
  ["fatalCases", "Số vụ có người chết"],
  ["multiVictimCases", "Số vụ có từ 2 người bị nạn trở lên"],
  ["victimCount", "Tổng số người bị nạn"],
  ["femaleCount", "Số lao động nữ bị nạn"],
  ["deathCount", "Số người chết"],
  ["severeCount", "Số người bị thương nặng"],
  ["unmanagedVictimCount", "Người bị nạn không thuộc quyền quản lý"],
  ["unmanagedFemaleCount", "Lao động nữ bị nạn không thuộc quyền quản lý"],
  ["unmanagedDeathCount", "Người chết không thuộc quyền quản lý"],
  ["unmanagedSevereCount", "Người bị thương nặng không thuộc quyền quản lý"],
  ["lostWorkDays", "Tổng số ngày nghỉ vì tai nạn"],
];

const MONEY_FIELDS: Array<[Article39MoneyKey, string]> = [
  ["medicalCostVnd", "Chi phí y tế"],
  ["salaryCostVnd", "Trả lương trong thời gian điều trị"],
  ["compensationCostVnd", "Bồi thường, trợ cấp"],
  ["propertyDamageVnd", "Thiệt hại tài sản"],
];

const count = (value: string) =>
  Math.max(0, Math.min(2_147_483_647, Number(value) || 0));
const money = (value: string) => value.replace(/\D/g, "").slice(0, 19) || "0";

const toBody = (report: OccupationalAccidentReport): Article39SummaryBody => {
  const summary = report.article39Summary;
  return {
    totalCases: summary.totalCases,
    fatalCases: summary.fatalCases,
    multiVictimCases: summary.multiVictimCases,
    victimCount: summary.victimCount,
    femaleCount: summary.femaleCount,
    deathCount: summary.deathCount,
    severeCount: summary.severeCount,
    unmanagedVictimCount: summary.unmanagedVictimCount,
    unmanagedFemaleCount: summary.unmanagedFemaleCount,
    unmanagedDeathCount: summary.unmanagedDeathCount,
    unmanagedSevereCount: summary.unmanagedSevereCount,
    medicalCostVnd: summary.medicalCostVnd,
    salaryCostVnd: summary.salaryCostVnd,
    compensationCostVnd: summary.compensationCostVnd,
    lostWorkDays: summary.lostWorkDays,
    propertyDamageVnd: summary.propertyDamageVnd,
  };
};

interface Article39FormProps {
  report: OccupationalAccidentReport;
  readOnly: boolean;
  saving: boolean;
  onSave: (body: Article39SummaryBody) => void;
}

export default function Article39Form({
  report,
  readOnly,
  saving,
  onSave,
}: Article39FormProps) {
  const [form, setForm] = useState<Article39SummaryBody>(() => toBody(report));

  const invalid =
    form.fatalCases > form.totalCases ||
    form.multiVictimCases > form.totalCases ||
    form.victimCount < form.totalCases + form.multiVictimCases ||
    form.femaleCount > form.victimCount ||
    form.deathCount + form.severeCount > form.victimCount ||
    form.unmanagedVictimCount > form.victimCount ||
    form.unmanagedFemaleCount > form.femaleCount ||
    form.unmanagedDeathCount > form.deathCount ||
    form.unmanagedSevereCount > form.severeCount;

  if (report.noAccidentsDeclared) {
    return (
      <Alert severity="info">
        Báo cáo đã xác nhận không phát sinh tai nạn lao động nên không nhập số
        liệu Khoản 2 Điều 39.
      </Alert>
    );
  }

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography sx={{ mb: 0.5, fontWeight: 700 }}>
        Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        Nhập số liệu tổng hợp của nhóm tai nạn này; số liệu sẽ được cộng tự động
        vào tổng quan.
      </Typography>
      {invalid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Số liệu số vụ, nạn nhân và mức độ thương tật chưa nhất quán.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        {COUNT_FIELDS.map(([key, label]) => (
          <TextField
            key={key}
            required
            size="small"
            type="number"
            label={label}
            value={form[key]}
            disabled={readOnly}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                [key]: count(event.target.value),
              }))
            }
            slotProps={{ htmlInput: { min: 0 } }}
          />
        ))}
        {MONEY_FIELDS.map(([key, label]) => (
          <TextField
            key={key}
            required
            size="small"
            label={`${label} (VND)`}
            value={form[key]}
            disabled={readOnly}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                [key]: money(event.target.value),
              }))
            }
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
        ))}
      </Box>
      {!readOnly && (
        <Box sx={{ mt: 2, textAlign: "right" }}>
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={saving || invalid}
            onClick={() => onSave(form)}
          >
            Lưu số liệu
          </Button>
        </Box>
      )}
    </Card>
  );
}
