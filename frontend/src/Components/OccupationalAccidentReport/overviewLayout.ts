import type {
  AccidentCause,
  AccidentCountMetrics,
  AccidentSummary,
  OccupationalAccidentOverview,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";

export const OVERVIEW_METRIC_KEYS = [
  "totalCases",
  "fatalCases",
  "multiVictimCases",
  "victimCount",
  "unmanagedVictimCount",
  "femaleCount",
  "unmanagedFemaleCount",
  "deathCount",
  "unmanagedDeathCount",
  "severeCount",
  "unmanagedSevereCount",
] as const satisfies ReadonlyArray<keyof AccidentCountMetrics>;

export const OVERVIEW_COLUMN_WIDTHS = [
  46,
  4,
  ...OVERVIEW_METRIC_KEYS.map(() => 50 / OVERVIEW_METRIC_KEYS.length),
];

export interface OverviewHeading {
  label: string;
  rowSpan?: number;
  colSpan?: number;
}

export const OVERVIEW_HEADER_ROWS: OverviewHeading[][] = [
  [
    { label: "Tên chỉ tiêu thống kê", rowSpan: 4 },
    { label: "Mã số", rowSpan: 4 },
    { label: "Phân loại TNLĐ theo mức độ thương tật", colSpan: 11 },
  ],
  [
    { label: "Số vụ (Vụ)", colSpan: 3 },
    { label: "Số người bị nạn (Người)", colSpan: 8 },
  ],
  [
    { label: "Tổng số", rowSpan: 2 },
    { label: "Số vụ có người chết", rowSpan: 2 },
    { label: "Số vụ có từ 2 người bị nạn trở lên", rowSpan: 2 },
    ...[
      "Tổng số",
      "Số lao động nữ",
      "Số người bị chết",
      "Số người bị thương nặng",
    ].map((label) => ({ label, colSpan: 2 })),
  ],
  Array.from({ length: 4 }).flatMap(() => [
    { label: "Tổng số" },
    { label: "Không thuộc quyền quản lý" },
  ]),
];

export const DAMAGE_COLUMN_WIDTHS = [38, 12, 10, 15, 13, 12];
export const DAMAGE_HEADER_ROWS: OverviewHeading[][] = [
  [
    {
      label: "Tổng số ngày nghỉ vì tai nạn lao động\n(Kể cả ngày nghỉ chế độ)",
      rowSpan: 3,
    },
    { label: "Thiệt hại do tai nạn lao động (VND)", colSpan: 4 },
    { label: "Thiệt hại tài sản\n(VND)", rowSpan: 3 },
  ],
  [
    { label: "Tổng số", rowSpan: 2 },
    { label: "Khoản chi cụ thể của cơ sở", colSpan: 3 },
  ],
  [
    { label: "Y tế" },
    { label: "Trả lương trong thời gian điều trị" },
    { label: "Bồi thường, trợ cấp" },
  ],
];
export const DAMAGE_METRIC_KEYS = [
  "lostWorkDays",
  "totalCostVnd",
  "medicalCostVnd",
  "salaryCostVnd",
  "compensationCostVnd",
  "propertyDamageVnd",
] as const satisfies ReadonlyArray<keyof AccidentSummary>;

export type OverviewBodyRow =
  | { kind: "section" | "group"; key: string; title: string }
  | {
      kind: "metrics";
      key: string;
      title: string;
      code: string;
      metrics: AccidentSummary;
      strong?: boolean;
      hover?: boolean;
    };

export function buildOverviewRows(
  overview: OccupationalAccidentOverview,
  report?: Pick<OccupationalAccidentReport, "cases">,
  causes: readonly AccidentCause[] = [],
): OverviewBodyRow[] {
  const causeGroups = new Map<number, "EMPLOYER" | "EMPLOYEE">();
  for (const accidentCase of report?.cases ?? []) {
    causeGroups.set(
      accidentCase.accidentCause.id,
      accidentCase.accidentCause.group,
    );
  }
  for (const cause of causes) causeGroups.set(cause.id, cause.causeGroup);
  const groupForCause = (row: { id: number; code: string }) => {
    const group = causeGroups.get(row.id);
    if (group) return group;
    // Older overview responses identify the standard causes by display order.
    const order = Number(row.code);
    if (order >= 1 && order <= 6) return "EMPLOYER";
    if (order >= 7 && order <= 9) return "EMPLOYEE";
    return "OTHER";
  };
  const breakdown = (
    prefix: string,
    rows: OccupationalAccidentOverview["byCause"],
  ): OverviewBodyRow[] =>
    rows.map((row) => ({
      kind: "metrics",
      key: `${prefix}-${row.id}`,
      title: row.name,
      code: row.code,
      metrics: row,
      hover: true,
    }));
  const otherCauses = overview.byCause.filter(
    (row) => groupForCause(row) === "OTHER",
  );
  return [
    { kind: "section", key: "regular-heading", title: "1. Tai nạn lao động" },
    {
      kind: "metrics",
      key: "regular",
      title: "Tai nạn lao động",
      code: "",
      metrics: overview.regular,
    },
    {
      kind: "section",
      key: "cause-heading",
      title: "1.1 Phân theo nguyên nhân xảy ra TNLĐ",
    },
    {
      kind: "group",
      key: "employer-heading",
      title: "a. Do người sử dụng lao động",
    },
    ...breakdown(
      "employer",
      overview.byCause.filter((row) => groupForCause(row) === "EMPLOYER"),
    ),
    { kind: "group", key: "employee-heading", title: "b. Do người lao động" },
    ...breakdown(
      "employee",
      overview.byCause.filter((row) => groupForCause(row) === "EMPLOYEE"),
    ),
    ...(otherCauses.length
      ? [
          {
            kind: "group" as const,
            key: "other-heading",
            title: "c. Nguyên nhân khác",
          },
          ...breakdown("other", otherCauses),
        ]
      : []),
    {
      kind: "section",
      key: "factor-heading",
      title: "1.2 Phân theo yếu tố gây chấn thương",
    },
    ...(overview.byInjuryFactor.length
      ? breakdown("factor", overview.byInjuryFactor)
      : [
          {
            kind: "group" as const,
            key: "factor-empty",
            title: "Không phát sinh số liệu.",
          },
        ]),
    {
      kind: "section",
      key: "occupation-heading",
      title: "1.3 Phân theo nghề nghiệp",
    },
    ...(overview.byOccupation.length
      ? breakdown("occupation", overview.byOccupation)
      : [
          {
            kind: "group" as const,
            key: "occupation-empty",
            title: "Không phát sinh số liệu.",
          },
        ]),
    {
      kind: "section",
      key: "article39-heading",
      title:
        "2. Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
    },
    {
      kind: "metrics",
      key: "article39",
      title: "Tai nạn được hưởng trợ cấp",
      code: "10",
      metrics: overview.article39,
    },
    { kind: "section", key: "total-heading", title: "3. Tổng số" },
    {
      kind: "metrics",
      key: "total",
      title: "Tổng số (3 = 1 + 2)",
      code: "",
      metrics: overview.grandTotal,
      strong: true,
    },
  ];
}
