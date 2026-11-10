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
import { formatVnd, sanitizeVndInput } from "@/services/money";

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
  const workforceRequirements = report.cases.reduce(
    (required, accidentCase) => {
      const managed = accidentCase.victimGroups.reduce(
        (total, group) => {
          if (group.isUnderEnterpriseManagement) {
            total.victims += group.victimCount;
            total.femaleVictims += group.femaleCount;
          }
          return total;
        },
        { victims: 0, femaleVictims: 0 },
      );
      required.employees = Math.max(required.employees, managed.victims);
      required.femaleEmployees = Math.max(
        required.femaleEmployees,
        managed.femaleVictims,
      );
      return required;
    },
    { employees: 0, femaleEmployees: 0 },
  );
  const totalEmployeesError =
    form.totalEmployees < workforceRequirements.employees;
  const femaleEmployeesError =
    form.femaleEmployees > form.totalEmployees ||
    form.femaleEmployees < workforceRequirements.femaleEmployees;
  const invalid = totalEmployeesError || femaleEmployeesError;

  return (
    <Stack spacing={1.5}>
      {report.status === "RETURNED" && report.returnedReason && (
        <Alert severity="warning">
          Yêu cầu bổ sung: {report.returnedReason}
        </Alert>
      )}
      <Card variant="outlined" sx={{ p: 2 }}>
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
            disabled={readOnly}
            error={totalEmployeesError}
            helperText={
              totalEmployeesError
                ? `Không được nhỏ hơn ${workforceRequirements.employees} nạn nhân thuộc quyền quản lý trong một vụ.`
                : undefined
            }
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
            label="Tổng số lao động nữ"
            value={form.femaleEmployees}
            disabled={readOnly}
            error={femaleEmployeesError}
            helperText={
              form.femaleEmployees > form.totalEmployees
                ? "Không được lớn hơn tổng số lao động."
                : form.femaleEmployees < workforceRequirements.femaleEmployees
                  ? `Không được nhỏ hơn ${workforceRequirements.femaleEmployees} lao động nữ bị nạn thuộc quyền quản lý trong một vụ.`
                  : undefined
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
            value={formatVnd(form.payrollFundVnd)}
            disabled={readOnly}
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
