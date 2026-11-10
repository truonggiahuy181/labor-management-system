"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, TextField, Typography } from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import type {
  Article39SummaryBody,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { formatVnd, sanitizeVndInput } from "@/services/money";

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

type CountFieldDefinition = [Article39CountKey, string];

const CASE_FIELDS: CountFieldDefinition[] = [
  ["totalCases", "Tổng số vụ"],
  ["fatalCases", "Số vụ có người chết"],
  ["multiVictimCases", "Số vụ có từ 2 người bị nạn trở lên"],
];

const VICTIM_FIELDS: CountFieldDefinition[] = [
  ["victimCount", "Tổng số người bị nạn"],
  ["femaleCount", "Số lao động nữ bị nạn"],
  ["deathCount", "Số người chết"],
  ["severeCount", "Số người bị thương nặng"],
];

const UNMANAGED_FIELDS: CountFieldDefinition[] = [
  ["unmanagedVictimCount", "Người bị nạn không thuộc quyền quản lý"],
  ["unmanagedFemaleCount", "Lao động nữ bị nạn không thuộc quyền quản lý"],
  ["unmanagedDeathCount", "Người chết không thuộc quyền quản lý"],
  ["unmanagedSevereCount", "Người bị thương nặng không thuộc quyền quản lý"],
];

const MONEY_FIELDS: Array<[Article39MoneyKey, string]> = [
  ["medicalCostVnd", "Chi phí y tế"],
  ["salaryCostVnd", "Trả lương trong thời gian điều trị"],
  ["compensationCostVnd", "Bồi thường, trợ cấp"],
];

const count = (value: string) =>
  Math.max(0, Math.min(2_147_483_647, Number(value) || 0));

type Article39Key = Article39CountKey | Article39MoneyKey;

// Mỗi quy tắc: fields[0] là ô "chính" – quy tắc chỉ được kiểm tra sau khi rời ô này (hoặc khi bấm Lưu),
// lỗi hiện dưới mọi ô liên quan đã rời. Thứ tự giữ như cũ để banner hiện lỗi đầu tiên.
type Article39Rule = {
  fields: Article39Key[];
  invalid: (form: Article39SummaryBody) => boolean;
  message: string;
};

const hasArticle39Data = (form: Article39SummaryBody) =>
  form.victimCount > 0 ||
  form.medicalCostVnd !== "0" ||
  form.salaryCostVnd !== "0" ||
  form.compensationCostVnd !== "0" ||
  form.lostWorkDays > 0 ||
  form.propertyDamageVnd !== "0";

const RULES: Article39Rule[] = [
  {
    fields: ["fatalCases", "totalCases"],
    invalid: (f) => f.fatalCases > f.totalCases,
    message: "Số vụ có người chết không được lớn hơn tổng số vụ.",
  },
  {
    fields: ["multiVictimCases", "totalCases"],
    invalid: (f) => f.multiVictimCases > f.totalCases,
    message: "Số vụ có từ 2 người bị nạn trở lên không được lớn hơn tổng số vụ.",
  },
  {
    fields: ["victimCount", "totalCases", "multiVictimCases"],
    invalid: (f) => f.victimCount < f.totalCases + f.multiVictimCases,
    message:
      "Tổng số người bị nạn chưa phù hợp: mỗi vụ có ít nhất 1 nạn nhân và mỗi vụ có từ 2 nạn nhân cần thêm ít nhất 1 người.",
  },
  {
    fields: ["fatalCases", "deathCount"],
    invalid: (f) => f.fatalCases > f.deathCount,
    message: "Số vụ có người chết không được lớn hơn số người chết.",
  },
  {
    fields: ["femaleCount", "victimCount"],
    invalid: (f) => f.femaleCount > f.victimCount,
    message: "Số lao động nữ bị nạn không được lớn hơn tổng số người bị nạn.",
  },
  {
    fields: ["severeCount", "deathCount", "victimCount"],
    invalid: (f) => f.deathCount + f.severeCount > f.victimCount,
    message:
      "Tổng số người chết và bị thương nặng không được lớn hơn tổng số người bị nạn.",
  },
  {
    fields: ["unmanagedVictimCount", "victimCount"],
    invalid: (f) => f.unmanagedVictimCount > f.victimCount,
    message:
      "Số người bị nạn ngoài phạm vi quản lý không được lớn hơn tổng số người bị nạn.",
  },
  {
    fields: ["unmanagedFemaleCount", "femaleCount"],
    invalid: (f) => f.unmanagedFemaleCount > f.femaleCount,
    message:
      "Số lao động nữ bị nạn ngoài phạm vi quản lý không được lớn hơn tổng số lao động nữ bị nạn.",
  },
  {
    fields: ["unmanagedDeathCount", "deathCount"],
    invalid: (f) => f.unmanagedDeathCount > f.deathCount,
    message:
      "Số người chết ngoài phạm vi quản lý không được lớn hơn tổng số người chết.",
  },
  {
    fields: ["unmanagedSevereCount", "severeCount"],
    invalid: (f) => f.unmanagedSevereCount > f.severeCount,
    message:
      "Số người bị thương nặng ngoài phạm vi quản lý không được lớn hơn tổng số người bị thương nặng.",
  },
  // 2 quy tắc dưới khớp CHECK chk_oa_article39_counts của DB
  {
    fields: ["unmanagedFemaleCount", "unmanagedVictimCount"],
    invalid: (f) => f.unmanagedFemaleCount > f.unmanagedVictimCount,
    message:
      "Số lao động nữ bị nạn ngoài phạm vi quản lý không được lớn hơn số người bị nạn ngoài phạm vi quản lý.",
  },
  {
    fields: ["unmanagedSevereCount", "unmanagedDeathCount", "unmanagedVictimCount"],
    invalid: (f) =>
      f.unmanagedDeathCount + f.unmanagedSevereCount > f.unmanagedVictimCount,
    message:
      "Tổng số người chết và bị thương nặng ngoài phạm vi quản lý không được lớn hơn số người bị nạn ngoài phạm vi quản lý.",
  },
  {
    fields: ["deathCount", "fatalCases"],
    invalid: (f) =>
      (f.deathCount === 0 && f.fatalCases !== 0) ||
      (f.deathCount > 0 && f.fatalCases === 0),
    message: "Số vụ có người chết phải phù hợp với số người chết.",
  },
  {
    fields: ["totalCases"],
    invalid: (f) => f.totalCases === 0 && hasArticle39Data(f),
    message: "Không được nhập nạn nhân hoặc thiệt hại khi tổng số vụ bằng 0.",
  },
];

// Lỗi đang hiển thị: quy tắc sai và ô chính đã rời (hoặc đã bấm Lưu) → gán cho các ô liên quan đã rời
const getFieldErrors = (
  form: Article39SummaryBody,
  touched: ReadonlySet<Article39Key>,
  all: boolean,
): Partial<Record<Article39Key, string>> => {
  const errors: Partial<Record<Article39Key, string>> = {};
  for (const rule of RULES) {
    if (!(all || touched.has(rule.fields[0])) || !rule.invalid(form)) continue;
    for (const field of rule.fields) {
      if ((all || touched.has(field)) && !errors[field]) errors[field] = rule.message;
    }
  }
  return errors;
};

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
  const [validationRequested, setValidationRequested] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<Article39Key>>(() => new Set());
  const touch = (key: Article39Key) =>
    setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
  const totalCostVnd = (
    BigInt(form.medicalCostVnd || "0") +
    BigInt(form.salaryCostVnd || "0") +
    BigInt(form.compensationCostVnd || "0")
  ).toString();

  const validationError = RULES.find((rule) => rule.invalid(form))?.message ?? "";
  const invalid = Boolean(validationError);
  const fieldErrors = getFieldErrors(form, touched, validationRequested);
  const gridSx = {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(4, minmax(0, 1fr))",
    },
    gap: 1.5,
  } as const;
  const renderCountField = ([key, label]: CountFieldDefinition) => (
    <TextField
      key={key}
      required
      size="small"
      type="number"
      label={label}
      value={form[key]}
      disabled={readOnly}
      error={Boolean(fieldErrors[key])}
      helperText={fieldErrors[key]}
      onBlur={() => touch(key)}
      onChange={(event) =>
        setForm((current) => ({
          ...current,
          [key]: count(event.target.value),
        }))
      }
      slotProps={{ htmlInput: { min: 0, step: 1 } }}
    />
  );
  const renderMoneyField = ([key, label]: [Article39MoneyKey, string]) => (
    <TextField
      key={key}
      required
      size="small"
      label={`${label} (VND)`}
      value={formatVnd(form[key])}
      disabled={readOnly}
      error={Boolean(fieldErrors[key])}
      helperText={fieldErrors[key]}
      onBlur={() => touch(key)}
      onChange={(event) =>
        setForm((current) => ({
          ...current,
          [key]: sanitizeVndInput(event.target.value),
        }))
      }
      slotProps={{ htmlInput: { inputMode: "numeric" } }}
    />
  );

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
      <Typography sx={{ mb: 1, fontWeight: 700 }}>
        1. Tổng số vụ tai nạn lao động và số nạn nhân tai nạn lao động
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Lưu ý: một vụ có thể đồng thời thuộc “Số vụ có người chết” và “Số vụ có
        từ 2 người bị nạn trở lên”. Không cộng hai chỉ tiêu này để so với tổng
        số vụ.
      </Typography>
      {validationRequested && invalid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}
      <Box sx={gridSx}>
        {CASE_FIELDS.map(renderCountField)}
        <Box sx={{ display: { xs: "none", lg: "block" } }} />
      </Box>
      <Box sx={{ ...gridSx, mt: 1.5 }}>
        {VICTIM_FIELDS.map(renderCountField)}
      </Box>
      <Box sx={{ ...gridSx, mt: 1.5 }}>
        {UNMANAGED_FIELDS.map(renderCountField)}
      </Box>

      <Typography sx={{ mt: 2.5, mb: 1.5, fontWeight: 700 }}>
        2. Thiệt hại do tai nạn lao động
      </Typography>
      <Box sx={gridSx}>
        {MONEY_FIELDS.map(renderMoneyField)}
        <TextField
          size="small"
          label="Tổng số tiền chi phí (VND)"
          value={formatVnd(totalCostVnd)}
          slotProps={{ input: { readOnly: true } }}
        />
      </Box>
      <Box sx={{ ...gridSx, mt: 1.5 }}>
        {renderCountField(["lostWorkDays", "Tổng số ngày nghỉ vì tai nạn"])}
        {renderMoneyField(["propertyDamageVnd", "Thiệt hại tài sản"])}
      </Box>
      {!readOnly && (
        <Box sx={{ mt: 2, textAlign: "right" }}>
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={saving}
            onClick={() => {
              setValidationRequested(true);
              if (invalid) return;
              setValidationRequested(false);
              onSave(form);
            }}
          >
            Lưu số liệu
          </Button>
        </Box>
      )}
    </Card>
  );
}
