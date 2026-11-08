"use client";

import {
  Card,
  Divider,
  Stack,
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
  AccidentSummary,
  OccupationalAccidentOverview,
} from "@/services/occupationalAccidentReport";

const formatMoney = (value: string) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || "0"));

const summaryRows: Array<[string, keyof AccidentSummary, "number" | "money"]> =
  [
    ["Tổng số vụ", "totalCases", "number"],
    ["Số vụ có người chết", "fatalCases", "number"],
    ["Số vụ có nhiều người bị nạn", "multiVictimCases", "number"],
    ["Tổng số người bị nạn", "victimCount", "number"],
    ["Số lao động nữ bị nạn", "femaleCount", "number"],
    ["Số người chết", "deathCount", "number"],
    ["Số người bị thương nặng", "severeCount", "number"],
    ["Tổng chi phí (VND)", "totalCostVnd", "money"],
    ["Tổng ngày nghỉ", "lostWorkDays", "number"],
    ["Thiệt hại tài sản (VND)", "propertyDamageVnd", "money"],
  ];

function SummaryTable({
  overview,
}: {
  overview: OccupationalAccidentOverview;
}) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Chỉ tiêu</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Tai nạn lao động
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Khoản 2 Điều 39
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Tổng cộng
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summaryRows.map(([label, key, type]) => (
            <TableRow key={key}>
              <TableCell>{label}</TableCell>
              {[overview.regular, overview.article39, overview.grandTotal].map(
                (summary, index) => (
                  <TableCell key={index} align="right">
                    {type === "money"
                      ? formatMoney(String(summary[key]))
                      : String(summary[key])}
                  </TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: AccidentBreakdownRow[];
}) {
  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <TableContainer
        sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 100, fontWeight: 600 }}>Mã</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Tên</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Số vụ
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Nạn nhân
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Số nữ
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Tử vong
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Thương nặng
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.totalCases}</TableCell>
                <TableCell align="right">{row.victimCount}</TableCell>
                <TableCell align="right">{row.femaleCount}</TableCell>
                <TableCell align="right">{row.deathCount}</TableCell>
                <TableCell align="right">{row.severeCount}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ py: 3, color: "text.secondary" }}
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

export default function OverviewPanel({
  overview,
}: {
  overview: OccupationalAccidentOverview;
}) {
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography sx={{ mb: 2, fontWeight: 700 }}>Tổng quan báo cáo</Typography>
      <SummaryTable overview={overview} />
      <Divider sx={{ my: 3 }} />
      <Stack spacing={3}>
        <BreakdownTable title="Phân theo nguyên nhân" rows={overview.byCause} />
        <BreakdownTable
          title="Phân theo yếu tố gây chấn thương"
          rows={overview.byInjuryFactor}
        />
        <BreakdownTable
          title="Phân theo nghề nghiệp"
          rows={overview.byOccupation}
        />
      </Stack>
    </Card>
  );
}
