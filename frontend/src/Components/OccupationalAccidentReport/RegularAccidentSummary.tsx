"use client";

import { Alert, Box, Card, TextField, Typography } from "@mui/material";
import type { AccidentSummary } from "@/services/occupationalAccidentReport";

const COUNT_FIELDS: Array<[keyof AccidentSummary, string]> = [
  ["totalCases", "Tổng số vụ"],
  ["fatalCases", "Tổng số vụ có người chết"],
  ["multiVictimCases", "Tổng số vụ có 2 người bị nạn trở lên"],
  ["victimCount", "Tổng số người bị nạn"],
  ["femaleCount", "Tổng số lao động nữ bị nạn"],
  ["deathCount", "Tổng số người bị chết"],
  ["severeCount", "Tổng số người bị thương nặng"],
  ["unmanagedVictimCount", "Số người bị nạn không thuộc quyền quản lý"],
  ["unmanagedFemaleCount", "Lao động nữ bị nạn không thuộc quyền quản lý"],
  ["unmanagedDeathCount", "Số người chết không thuộc quyền quản lý"],
  ["unmanagedSevereCount", "Người bị thương nặng không thuộc quyền quản lý"],
];

const MONEY_FIELDS: Array<[keyof AccidentSummary, string]> = [
  ["medicalCostVnd", "Chi phí y tế"],
  ["salaryCostVnd", "Chi phí trả lương trong thời gian điều trị"],
  ["compensationCostVnd", "Chi phí bồi thường, trợ cấp"],
  ["totalCostVnd", "Tổng số tiền chi phí"],
  ["propertyDamageVnd", "Thiệt hại tài sản"],
];

const formatMoney = (value: string | number) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(String(value || "0")));

export default function RegularAccidentSummary({
  summary,
}: {
  summary: AccidentSummary;
}) {
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography sx={{ mb: 1.5, fontWeight: 700 }}>
        1. Tổng số vụ tai nạn lao động và số nạn nhân tai nạn lao động
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Số liệu được tự động tổng hợp từ phần chi tiết các vụ tai nạn lao động.
      </Alert>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {COUNT_FIELDS.map(([key, label]) => (
          <TextField
            key={key}
            size="small"
            label={label}
            value={String(summary[key])}
            slotProps={{ input: { readOnly: true } }}
          />
        ))}
      </Box>

      <Typography sx={{ mt: 2.5, mb: 1.5, fontWeight: 700 }}>
        2. Thiệt hại do tai nạn lao động
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {MONEY_FIELDS.map(([key, label]) => (
          <TextField
            key={key}
            size="small"
            label={`${label} (VND)`}
            value={formatMoney(summary[key])}
            slotProps={{ input: { readOnly: true } }}
          />
        ))}
        <TextField
          size="small"
          label="Tổng số ngày nghỉ vì tai nạn lao động"
          value={summary.lostWorkDays}
          slotProps={{ input: { readOnly: true } }}
        />
      </Box>
    </Card>
  );
}
