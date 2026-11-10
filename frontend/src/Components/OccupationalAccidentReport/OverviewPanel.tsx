"use client";

import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type {
  AccidentBreakdownRow,
  AccidentCountMetrics,
  AccidentSummary,
  OccupationalAccidentOverview,
} from "@/services/occupationalAccidentReport";

const METRIC_KEYS: Array<keyof AccidentCountMetrics> = [
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
];

const borderCell = {
  border: "1px solid",
  borderColor: "divider",
  fontSize: 12,
  px: 0.75,
  py: 0.8,
};

const headerCell = {
  ...borderCell,
  bgcolor: "grey.100",
  color: "text.secondary",
  fontWeight: 700,
  textAlign: "center",
  verticalAlign: "middle",
  lineHeight: 1.25,
};

const formatMoney = (value: string) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || "0"));

function MetricCells({ metrics }: { metrics: AccidentCountMetrics }) {
  return METRIC_KEYS.map((key) => (
    <TableCell key={key} align="right" sx={{ ...borderCell, minWidth: 58 }}>
      {metrics[key]}
    </TableCell>
  ));
}

function SectionRow({ title }: { title: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={13}
        sx={{ ...borderCell, fontWeight: 700, bgcolor: "grey.50" }}
      >
        {title}
      </TableCell>
    </TableRow>
  );
}

function GroupRow({ title }: { title: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={13}
        sx={{ ...borderCell, pl: 2.5, fontStyle: "italic" }}
      >
        {title}
      </TableCell>
    </TableRow>
  );
}

function BreakdownRow({
  row,
  code,
}: {
  row: AccidentBreakdownRow;
  code?: string;
}) {
  return (
    <TableRow hover>
      <TableCell sx={{ ...borderCell, minWidth: 360, pl: 2 }}>
        {row.name}
      </TableCell>
      <TableCell align="center" sx={{ ...borderCell, width: 64 }}>
        {code ?? row.code}
      </TableCell>
      <MetricCells metrics={row} />
    </TableRow>
  );
}

function SummaryRow({
  title,
  code,
  summary,
  strong = false,
}: {
  title: string;
  code?: string;
  summary: AccidentSummary;
  strong?: boolean;
}) {
  return (
    <TableRow sx={strong ? { bgcolor: "primary.50" } : undefined}>
      <TableCell sx={{ ...borderCell, fontWeight: 700 }}>{title}</TableCell>
      <TableCell align="center" sx={{ ...borderCell, fontWeight: 700 }}>
        {code ?? ""}
      </TableCell>
      <MetricCells metrics={summary} />
    </TableRow>
  );
}

function DamageTable({ summary }: { summary: AccidentSummary }) {
  return (
    <TableContainer sx={{ mt: 2 }}>
      <Table size="small" sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={3} sx={{ ...headerCell, minWidth: 260 }}>
              Tổng số ngày nghỉ vì tai nạn lao động
              <br />
              (Kể cả ngày nghỉ chế độ)
            </TableCell>
            <TableCell colSpan={4} sx={headerCell}>
              Tổng số ngày nghỉ và thiệt hại do TNLĐ (VND)
            </TableCell>
            <TableCell rowSpan={3} sx={{ ...headerCell, minWidth: 150 }}>
              Thiệt hại tài sản
              <br />
              (VND)
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell rowSpan={2} sx={{ ...headerCell, minWidth: 130 }}>
              Tổng số
            </TableCell>
            <TableCell colSpan={3} sx={headerCell}>
              Khoản chi cụ thể của cơ sở
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ ...headerCell, minWidth: 120 }}>Y tế</TableCell>
            <TableCell sx={{ ...headerCell, minWidth: 170 }}>
              Trả lương trong thời gian điều trị
            </TableCell>
            <TableCell sx={{ ...headerCell, minWidth: 150 }}>
              Bồi thường, trợ cấp
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell align="center" sx={borderCell}>
              {summary.lostWorkDays}
            </TableCell>
            <TableCell align="right" sx={borderCell}>
              {formatMoney(summary.totalCostVnd)}
            </TableCell>
            <TableCell align="right" sx={borderCell}>
              {formatMoney(summary.medicalCostVnd)}
            </TableCell>
            <TableCell align="right" sx={borderCell}>
              {formatMoney(summary.salaryCostVnd)}
            </TableCell>
            <TableCell align="right" sx={borderCell}>
              {formatMoney(summary.compensationCostVnd)}
            </TableCell>
            <TableCell align="right" sx={borderCell}>
              {formatMoney(summary.propertyDamageVnd)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function OverviewPanel({
  overview,
}: {
  overview: OccupationalAccidentOverview;
}) {
  const employerCauses = overview.byCause.filter(
    (row) => Number(row.code) <= 6,
  );
  const employeeCauses = overview.byCause.filter((row) => Number(row.code) > 6);
  const factorCodeStart = 101;
  const occupationCodeStart = factorCodeStart + overview.byInjuryFactor.length;

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography sx={{ mb: 2, fontWeight: 700 }}>
        Báo cáo tổng hợp tình hình tai nạn lao động
      </Typography>
      <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1380 }}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={4} sx={{ ...headerCell, minWidth: 360 }}>
                Tên chỉ tiêu thống kê
              </TableCell>
              <TableCell rowSpan={4} sx={{ ...headerCell, minWidth: 64 }}>
                Mã số
              </TableCell>
              <TableCell colSpan={11} sx={headerCell}>
                Phân loại TNLĐ theo mức độ thương tật
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={3} sx={headerCell}>
                Số vụ (Vụ)
              </TableCell>
              <TableCell colSpan={8} sx={headerCell}>
                Số người bị nạn (Người)
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell rowSpan={2} sx={headerCell}>
                Tổng số
              </TableCell>
              <TableCell rowSpan={2} sx={headerCell}>
                Số vụ có người chết
              </TableCell>
              <TableCell rowSpan={2} sx={headerCell}>
                Số vụ có từ 2 người bị nạn trở lên
              </TableCell>
              {[
                "Tổng số",
                "Số lao động nữ",
                "Số người bị chết",
                "Số người bị thương nặng",
              ].map((label) => (
                <TableCell key={label} colSpan={2} sx={headerCell}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {Array.from({ length: 4 }).flatMap((_, index) => [
                <TableCell key={`${index}-total`} sx={headerCell}>
                  Tổng số
                </TableCell>,
                <TableCell key={`${index}-unmanaged`} sx={headerCell}>
                  Không thuộc quyền quản lý
                </TableCell>,
              ])}
            </TableRow>
          </TableHead>
          <TableBody>
            <SummaryRow
              title="1. Tai nạn lao động"
              summary={overview.regular}
              strong
            />
            <SectionRow title="1.1 Phân theo nguyên nhân xảy ra TNLĐ" />
            <GroupRow title="a. Do người sử dụng lao động" />
            {employerCauses.map((row) => (
              <BreakdownRow key={row.id} row={row} />
            ))}
            <GroupRow title="b. Do người lao động" />
            {employeeCauses.map((row) => (
              <BreakdownRow key={row.id} row={row} />
            ))}
            <SectionRow title="1.2 Phân theo yếu tố gây chấn thương" />
            {overview.byInjuryFactor.map((row, index) => (
              <BreakdownRow
                key={row.id}
                row={row}
                code={String(factorCodeStart + index)}
              />
            ))}
            <SectionRow title="1.3 Phân theo nghề nghiệp" />
            {overview.byOccupation.map((row, index) => (
              <BreakdownRow
                key={row.id}
                row={row}
                code={String(occupationCodeStart + index)}
              />
            ))}
            <SummaryRow
              title="2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ"
              code="10"
              summary={overview.article39}
            />
            <SummaryRow
              title="3. Tổng số (3=1+2)"
              summary={overview.grandTotal}
              strong
            />
          </TableBody>
        </Table>
      </TableContainer>
      <Typography sx={{ mt: 3, fontWeight: 700 }}>
        II. Thiệt hại do tai nạn lao động
      </Typography>
      <DamageTable summary={overview.grandTotal} />
    </Card>
  );
}
