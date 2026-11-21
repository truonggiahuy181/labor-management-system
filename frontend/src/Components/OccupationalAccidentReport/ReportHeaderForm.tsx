"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Card,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type {
  OccupationalAccidentReport,
  UpdateReportHeaderBody,
} from "@/services/occupationalAccidentReport";
import { formatVnd, sanitizeVndInput } from "@/services/money";
import { getReportHeaderErrors, MAX_EMPLOYEES } from "./reportHeaderValidation";

type HeaderFormValues = Omit<
  UpdateReportHeaderBody,
  "totalEmployees" | "femaleEmployees"
> & { totalEmployees: string; femaleEmployees: string };

interface ReportHeaderFormProps {
  id: string;
  report: OccupationalAccidentReport;
  readOnly: boolean;
  saving: boolean;
  /** Trả về true khi lưu thành công → form coi dữ liệu hiện tại là đã lưu */
  onSave: (body: UpdateReportHeaderBody) => Promise<boolean>;
  onContinue: () => void;
  /** Báo cho trang cha biết form có thay đổi chưa lưu (để cảnh báo khi chuyển mục) */
  onDirtyChange?: (dirty: boolean) => void;
}

const toForm = (report: OccupationalAccidentReport): HeaderFormValues => ({
  totalEmployees: String(report.totalEmployees),
  femaleEmployees: String(report.femaleEmployees),
  payrollFundVnd: report.payrollFundVnd,
  noAccidentsDeclared: report.noAccidentsDeclared,
});

export default function ReportHeaderForm({
  id,
  report,
  readOnly,
  saving,
  onSave,
  onContinue,
  onDirtyChange,
}: ReportHeaderFormProps) {
  // Mốc so sánh "đã lưu": dữ liệu lúc mở form, cập nhật lại mỗi lần lưu thành công
  const [saved, setSaved] = useState(() => toForm(report));
  const [form, setForm] = useState<HeaderFormValues>(saved);
  const totalInputRef = useRef<HTMLInputElement>(null);
  const femaleInputRef = useRef<HTMLInputElement>(null);
  const payrollInputRef = useRef<HTMLInputElement>(null);
  const continuingRef = useRef(false);
  const dirty = !readOnly && JSON.stringify(form) !== JSON.stringify(saved);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const errors = getReportHeaderErrors(
    form.totalEmployees,
    form.femaleEmployees,
    report.cases,
    form.payrollFundVnd,
  );

  return (
    <Stack spacing={1.5}>
      {report.status === "RETURNED" && report.returnedReason && (
        <Alert severity="warning">
          Yêu cầu bổ sung: {report.returnedReason}
        </Alert>
      )}
      <Card
        component="form"
        id={id}
        noValidate
        variant="outlined"
        sx={{ p: 2 }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (readOnly || saving || continuingRef.current) return;
          if (Object.keys(errors).length > 0) {
            const input = errors.totalEmployees
              ? totalInputRef.current
              : errors.femaleEmployees
                ? femaleInputRef.current
                : payrollInputRef.current;
            input?.focus();
            input?.scrollIntoView({ block: "center", behavior: "smooth" });
            return;
          }
          if (!dirty) {
            onContinue();
            return;
          }
          continuingRef.current = true;
          try {
            if (
              await onSave({
                ...form,
                totalEmployees: Number(form.totalEmployees),
                femaleEmployees: Number(form.femaleEmployees),
              })
            ) {
              setSaved(form);
              onContinue();
            }
          } finally {
            continuingRef.current = false;
          }
        }}
      >
        <Typography sx={{ mb: 0.75, fontWeight: 700 }}>
          1. Thông tin công ty
        </Typography>
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          Lưu ý: nhập tổng quỹ lương 6 tháng khi khai báo TNLĐ 6 tháng hoặc tổng
          quỹ lương 12 tháng khi khai báo TNLĐ cả năm.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 1.5,
          }}
        >
          <TextField
            size="small"
            label="Tên công ty"
            value={report.enterprise.enterpriseName}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label="Loại hình công ty"
            value={report.enterprise.businessTypeName}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label="Ngành nghề kinh doanh"
            value={report.enterprise.industryName}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            required
            size="small"
            type="number"
            label="Tổng số lao động của cơ sở"
            value={form.totalEmployees}
            inputRef={totalInputRef}
            disabled={readOnly || saving}
            error={!readOnly && !!errors.totalEmployees}
            helperText={!readOnly ? errors.totalEmployees : undefined}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                totalEmployees: event.target.value,
              }))
            }
            slotProps={{ htmlInput: { min: 1, max: MAX_EMPLOYEES, step: 1 } }}
          />
          <TextField
            required
            size="small"
            type="number"
            label="Tổng số lao động nữ"
            value={form.femaleEmployees}
            inputRef={femaleInputRef}
            disabled={readOnly || saving}
            error={!readOnly && !!errors.femaleEmployees}
            helperText={!readOnly ? errors.femaleEmployees : undefined}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                femaleEmployees: event.target.value,
              }))
            }
            slotProps={{ htmlInput: { min: 0, max: MAX_EMPLOYEES, step: 1 } }}
          />
          <TextField
            required
            size="small"
            label="Tổng quỹ lương (VND)"
            value={formatVnd(form.payrollFundVnd)}
            inputRef={payrollInputRef}
            disabled={readOnly || saving}
            error={!readOnly && !!errors.payrollFundVnd}
            helperText={!readOnly ? errors.payrollFundVnd : undefined}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                payrollFundVnd: sanitizeVndInput(event.target.value),
              }))
            }
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
          <FormControlLabel
            sx={{ gridColumn: { md: "1 / -1" } }}
            control={
              <Checkbox
                checked={form.noAccidentsDeclared}
                disabled={
                  readOnly ||
                  saving ||
                  report.cases.length > 0 ||
                  report.article39Summary.totalCases > 0
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    noAccidentsDeclared: event.target.checked,
                  }))
                }
              />
            }
            label="Doanh nghiệp không phát sinh tai nạn lao động trong kỳ báo cáo"
          />
        </Box>
      </Card>
    </Stack>
  );
}
