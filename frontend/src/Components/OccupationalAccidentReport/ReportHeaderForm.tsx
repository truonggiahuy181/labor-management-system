"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import type {
  OccupationalAccidentReport,
  UpdateReportHeaderBody,
} from "@/services/occupationalAccidentReport";

const money = (value: string) => value.replace(/\D/g, "").slice(0, 19) || "0";
const count = (value: string) =>
  Math.max(0, Math.min(2_147_483_647, Number(value) || 0));

interface ReportHeaderFormProps {
  report: OccupationalAccidentReport;
  readOnly: boolean;
  saving: boolean;
  onSave: (body: UpdateReportHeaderBody) => void;
}

export default function ReportHeaderForm({
  report,
  readOnly,
  saving,
  onSave,
}: ReportHeaderFormProps) {
  const [form, setForm] = useState<UpdateReportHeaderBody>(() => ({
    totalEmployees: report.totalEmployees,
    femaleEmployees: report.femaleEmployees,
    payrollFundVnd: report.payrollFundVnd,
    noAccidentsDeclared: report.noAccidentsDeclared,
  }));

  const invalid = form.femaleEmployees > form.totalEmployees;

  return (
    <Stack spacing={2}>
      {report.status === "RETURNED" && report.returnedReason && (
        <Alert severity="warning">
          Yêu cầu bổ sung: {report.returnedReason}
        </Alert>
      )}

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 2, fontWeight: 700 }}>
          Thông tin doanh nghiệp
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 2,
          }}
        >
          <TextField
            size="small"
            label="Tên doanh nghiệp"
            value={report.enterprise.enterpriseName}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label="Mã số thuế"
            value={report.enterprise.taxCode}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label="Loại hình doanh nghiệp"
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
            size="small"
            label="Địa chỉ"
            value={report.enterprise.address}
            slotProps={{ input: { readOnly: true } }}
            sx={{ gridColumn: { md: "1 / -1" } }}
          />
        </Box>
      </Card>

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 2, fontWeight: 700 }}>
          Lao động và quỹ lương trong kỳ
        </Typography>
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
            type="number"
            label="Tổng số lao động"
            value={form.totalEmployees}
            disabled={readOnly}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                totalEmployees: count(event.target.value),
              }))
            }
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            required
            size="small"
            type="number"
            label="Số lao động nữ"
            value={form.femaleEmployees}
            disabled={readOnly}
            error={invalid}
            helperText={
              invalid ? "Không được lớn hơn tổng số lao động" : undefined
            }
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                femaleEmployees: count(event.target.value),
              }))
            }
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            required
            size="small"
            label="Tổng quỹ lương (VND)"
            value={form.payrollFundVnd}
            disabled={readOnly}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                payrollFundVnd: money(event.target.value),
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
        {!readOnly && (
          <Box sx={{ mt: 2, textAlign: "right" }}>
            <Button
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              disabled={saving || invalid}
              onClick={() => onSave(form)}
            >
              Lưu thông tin
            </Button>
          </Box>
        )}
      </Card>
    </Stack>
  );
}
