"use client";

import type { ReactNode } from "react";
import {
  Box,
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
  AccidentCountMetrics,
  AccidentSummary,
  AccidentCause,
  OccupationalAccidentOverview,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { getReportPeriodLabel } from "@/services/reportPeriod";
import {
  OVERVIEW_METRIC_KEYS as METRIC_KEYS,
  OVERVIEW_COLUMN_WIDTHS,
  OVERVIEW_HEADER_ROWS,
  DAMAGE_COLUMN_WIDTHS,
  DAMAGE_HEADER_ROWS,
  DAMAGE_METRIC_KEYS,
  buildOverviewRows,
  type OverviewHeading,
} from "./overviewLayout";

const borderCell = {
  border: "1px solid",
  borderColor: "divider",
  fontSize: 11,
  px: 0.75,
  py: 1,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
};

const headerCell = {
  ...borderCell,
  bgcolor: "grey.50",
  color: "text.secondary",
  fontWeight: 600,
  textAlign: "center",
  verticalAlign: "middle",
  lineHeight: 1.25,
  whiteSpace: "pre-line",
};

const formatMoney = (value: string) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || "0"));
const formatCount = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

function MetricCells({ metrics }: { metrics: AccidentCountMetrics }) {
  return METRIC_KEYS.map((key) => (
    <TableCell key={key} align="right" sx={{ ...borderCell, height: 48 }}>
      {formatCount(metrics[key])}
    </TableCell>
  ));
}

function SectionRow({ title }: { title: string }) {
  return (
    <TableRow>
      <TableCell
        component="th"
        scope="rowgroup"
        colSpan={13}
        sx={{ ...borderCell, fontWeight: 700, textAlign: "left", py: 0.75 }}
      >
        {title}
      </TableCell>
    </TableRow>
  );
}

function GroupRow({ title }: { title: string }) {
  return (
    <TableRow>
      <TableCell colSpan={13} sx={{ ...borderCell, pl: 1.5, py: 0.75 }}>
        {title}
      </TableCell>
    </TableRow>
  );
}

function BreakdownRow({
  title,
  code,
  metrics,
}: {
  title: string;
  code: string;
  metrics: AccidentSummary;
}) {
  return (
    <TableRow hover>
      <TableCell sx={{ ...borderCell, pl: 1, height: 48 }}>{title}</TableCell>
      <TableCell align="center" sx={borderCell}>
        {code}
      </TableCell>
      <MetricCells metrics={metrics} />
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
      <TableCell
        sx={{ ...borderCell, height: 48, fontWeight: strong ? 700 : 400 }}
      >
        {title}
      </TableCell>
      <TableCell align="center" sx={borderCell}>
        {code ?? ""}
      </TableCell>
      <MetricCells metrics={summary} />
    </TableRow>
  );
}

function OverviewTableHeader({ rows }: { rows: OverviewHeading[][] }) {
  return (
    <TableHead>
      {rows.map((row, rowIndex) => (
        <TableRow key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <TableCell
              key={`${rowIndex}-${cellIndex}`}
              rowSpan={cell.rowSpan}
              colSpan={cell.colSpan}
              sx={headerCell}
            >
              {cell.label}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableHead>
  );
}

function DamageTable({ summary }: { summary: AccidentSummary }) {
  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table
        size="small"
        aria-label="Thiệt hại do tai nạn lao động"
        sx={{ minWidth: 1180, tableLayout: "fixed" }}
      >
        <colgroup>
          {DAMAGE_COLUMN_WIDTHS.map((width, index) => (
            <col key={index} style={{ width: `${width}%` }} />
          ))}
        </colgroup>
        <OverviewTableHeader rows={DAMAGE_HEADER_ROWS} />
        <TableBody>
          <TableRow>
            {DAMAGE_METRIC_KEYS.map((key) => {
              const value = summary[key];
              return (
                <TableCell
                  key={key}
                  align={key === "lostWorkDays" ? "center" : "right"}
                  sx={borderCell}
                >
                  {typeof value === "number"
                    ? formatCount(value)
                    : formatMoney(value)}
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function OverviewPanel({
  overview,
  report,
  causes = [],
  headerContent,
}: {
  overview: OccupationalAccidentOverview;
  report?: OccupationalAccidentReport;
  causes?: AccidentCause[];
  headerContent?: ReactNode;
}) {
  const rows = buildOverviewRows(overview, report, causes);

  return (
    <Card variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          Báo cáo tổng hợp tình hình tai nạn lao động
          {report &&
            ` - Kỳ báo cáo: ${getReportPeriodLabel(report.reportPeriod.periodCode)} ${report.reportPeriod.reportYear}`}
        </Typography>
        {headerContent && <Box sx={{ mt: 1.5 }}>{headerContent}</Box>}
      </Box>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table
          size="small"
          aria-label="Tổng quan báo cáo tai nạn lao động"
          sx={{ minWidth: 1180, width: "100%", tableLayout: "fixed" }}
        >
          <colgroup>
            {OVERVIEW_COLUMN_WIDTHS.map((width, index) => (
              <col key={index} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <OverviewTableHeader rows={OVERVIEW_HEADER_ROWS} />
          <TableBody>
            {rows.map((row) => {
              if (row.kind === "metrics")
                return row.hover ? (
                  <BreakdownRow
                    key={row.key}
                    title={row.title}
                    code={row.code}
                    metrics={row.metrics}
                  />
                ) : (
                  <SummaryRow
                    key={row.key}
                    title={row.title}
                    code={row.code}
                    summary={row.metrics}
                    strong={row.strong}
                  />
                );
              return row.kind === "section" ? (
                <SectionRow key={row.key} title={row.title} />
              ) : (
                <GroupRow key={row.key} title={row.title} />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography sx={{ px: 1, py: 0.9, fontSize: 11, fontWeight: 700 }}>
        II. Thiệt hại do tai nạn lao động
      </Typography>
      <DamageTable summary={overview.grandTotal} />
    </Card>
  );
}
