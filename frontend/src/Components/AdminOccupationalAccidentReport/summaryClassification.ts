import type {
  AccidentBreakdownRow,
  AccidentSummary,
  AdminOccupationalAccidentSummary,
} from "@/services/occupationalAccidentReport";

export interface ClassificationHeading {
  label: string;
  rowSpan?: number;
  colSpan?: number;
}

export const CLASSIFICATION_HEADER_ROWS: ClassificationHeading[][] = [
  [
    { label: "Nhóm phân loại", rowSpan: 3 },
    { label: "Tên chỉ tiêu thống kê", rowSpan: 3 },
    { label: "Mã số", rowSpan: 3 },
    { label: "Phân loại TNLĐ theo mức độ thương tật", colSpan: 7 },
    { label: "Thiệt hại do tai nạn lao động", colSpan: 6 },
  ],
  [
    { label: "Số vụ TNLĐ (vụ)", colSpan: 3 },
    { label: "Số người bị nạn (người)", colSpan: 4 },
    { label: "Tổng số ngày nghỉ vì TNLĐ", rowSpan: 2 },
    { label: "Tổng số tiền (VND)", rowSpan: 2 },
    { label: "Khoản chi cụ thể của cơ sở (VND)", colSpan: 3 },
    { label: "Thiệt hại tài sản (VND)", rowSpan: 2 },
  ],
  [
    { label: "Tổng số" },
    { label: "Số vụ có người chết" },
    { label: "Số vụ có từ 2 người bị nạn trở lên" },
    { label: "Tổng số" },
    { label: "Số lao động nữ" },
    { label: "Số người chết" },
    { label: "Số người bị thương nặng" },
    { label: "Y tế" },
    { label: "Trả lương trong thời gian điều trị" },
    { label: "Bồi thường, trợ cấp" },
  ],
];

export const CLASSIFICATION_METRIC_KEYS = [
  "totalCases",
  "fatalCases",
  "multiVictimCases",
  "victimCount",
  "femaleCount",
  "deathCount",
  "severeCount",
  "lostWorkDays",
  "totalCostVnd",
  "medicalCostVnd",
  "salaryCostVnd",
  "compensationCostVnd",
  "propertyDamageVnd",
] as const satisfies ReadonlyArray<keyof AccidentSummary>;

// Three identifying columns, seven count columns, days off and five amounts.
export const CLASSIFICATION_COLUMN_WIDTHS = [
  6, 24, 4, 4, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 6,
] as const;

export const UNMANAGED_METRIC_KEYS = [
  "unmanagedVictimCount",
  "unmanagedFemaleCount",
  "unmanagedDeathCount",
  "unmanagedSevereCount",
] as const satisfies ReadonlyArray<keyof AccidentSummary>;

export const UNMANAGED_HEADER_LABELS = [
  "Nhóm phân loại",
  "Tên chỉ tiêu thống kê",
  "Mã số",
  "Tổng số người bị nạn",
  "Số lao động nữ bị nạn",
  "Số người chết",
  "Số người bị thương nặng",
] as const;

export interface ClassificationGroup {
  key: string;
  label: string;
  rows: AccidentBreakdownRow[];
}

export const getClassificationGroups = (
  summary: AdminOccupationalAccidentSummary,
): ClassificationGroup[] => [
  { key: "industry", label: "Phân theo ngành nghề", rows: summary.byIndustry },
  {
    key: "cause",
    label: "Phân theo nguyên nhân",
    rows: summary.overview.byCause,
  },
  {
    key: "injury-factor",
    label: "Phân theo yếu tố gây chấn thương",
    rows: summary.overview.byInjuryFactor,
  },
];

export const getClassificationTotals = (
  summary: AdminOccupationalAccidentSummary,
) => [
  { label: "Tổng số", value: summary.overview.grandTotal, strong: true },
  { label: "Trong đó: Tai nạn lao động", value: summary.overview.regular },
  {
    label: "Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ",
    value: summary.overview.article39,
  },
];

const integer = new Intl.NumberFormat("vi-VN");

export function formatClassificationValue(
  row: AccidentSummary,
  key: keyof AccidentSummary,
) {
  const value = row[key];
  return integer.format(
    typeof value === "string" ? BigInt(value || "0") : value,
  );
}
