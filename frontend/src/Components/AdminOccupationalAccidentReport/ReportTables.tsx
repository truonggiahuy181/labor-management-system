'use client';

import {
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type {
  AccidentBreakdownRow,
  AccidentCountMetrics,
  AccidentSummary,
  OccupationalAccidentOverview,
} from '@/services/occupationalAccidentReport';
import { formatReportMoney } from './status';

const countColumns: Array<{ key: keyof AccidentCountMetrics; label: string }> = [
  { key: 'totalCases', label: 'Tổng số vụ' },
  { key: 'fatalCases', label: 'Số vụ chết người' },
  { key: 'multiVictimCases', label: 'Số vụ từ 2 người bị nạn trở lên' },
  { key: 'victimCount', label: 'Tổng số người bị nạn' },
  { key: 'femaleCount', label: 'Số lao động nữ' },
  { key: 'deathCount', label: 'Số người chết' },
  { key: 'severeCount', label: 'Số người bị thương nặng' },
  { key: 'unmanagedVictimCount', label: 'Nạn nhân không thuộc quản lý' },
];

const damageColumns: Array<{
  key: keyof AccidentSummary;
  label: string;
  money?: boolean;
}> = [
  { key: 'totalCostVnd', label: 'Tổng chi phí (VND)', money: true },
  { key: 'lostWorkDays', label: 'Tổng ngày nghỉ' },
  { key: 'propertyDamageVnd', label: 'Thiệt hại tài sản (VND)', money: true },
];

function SummaryTable({ overview }: { overview: OccupationalAccidentOverview }) {
  const rows = [
    { label: 'Tai nạn lao động', value: overview.regular },
    { label: 'Khoản 2 Điều 39 Luật ATVSLĐ', value: overview.article39 },
    { label: 'Tổng số', value: overview.grandTotal },
  ];

  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider' }}>
      <Table size="small" sx={{ minWidth: 1540 }}>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={{ minWidth: 220, fontWeight: 700 }}>
              Tên chỉ tiêu thống kê
            </TableCell>
            <TableCell colSpan={countColumns.length} align="center" sx={{ fontWeight: 700 }}>
              Phân loại tai nạn lao động theo mức độ thương tật
            </TableCell>
            <TableCell colSpan={damageColumns.length} align="center" sx={{ fontWeight: 700 }}>
              Thiệt hại do tai nạn lao động
            </TableCell>
          </TableRow>
          <TableRow>
            {[...countColumns, ...damageColumns].map((column) => (
              <TableCell key={column.key} align="center" sx={{ minWidth: 105, fontWeight: 600 }}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.label} sx={index === rows.length - 1 ? { bgcolor: 'grey.50' } : undefined}>
              <TableCell sx={{ fontWeight: index === rows.length - 1 ? 700 : 500 }}>
                {row.label}
              </TableCell>
              {countColumns.map((column) => (
                <TableCell key={column.key} align="right">
                  {String(row.value[column.key])}
                </TableCell>
              ))}
              {damageColumns.map((column) => (
                <TableCell key={column.key} align="right">
                  {column.money
                    ? formatReportMoney(String(row.value[column.key]))
                    : String(row.value[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: AccidentBreakdownRow[] }) {
  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <TableContainer sx={{ border: 1, borderColor: 'divider' }}>
        <Table size="small" sx={{ minWidth: 1180 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 300, fontWeight: 600 }}>Tên chỉ tiêu thống kê</TableCell>
              <TableCell sx={{ width: 90, fontWeight: 600 }}>Mã số</TableCell>
              {countColumns.map((column) => (
                <TableCell key={column.key} align="center" sx={{ minWidth: 100, fontWeight: 600 }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.code}</TableCell>
                {countColumns.map((column) => (
                  <TableCell key={column.key} align="right">
                    {row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={countColumns.length + 2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
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

export default function ReportTables({ overview }: { overview: OccupationalAccidentOverview }) {
  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 2, fontWeight: 700 }}>I. Tổng hợp tình hình tai nạn lao động</Typography>
        <SummaryTable overview={overview} />
      </Card>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 2, fontWeight: 700 }}>II. Phân loại tai nạn lao động</Typography>
        <Stack spacing={3}>
          <BreakdownTable title="1. Phân theo nguyên nhân xảy ra tai nạn lao động" rows={overview.byCause} />
          <BreakdownTable title="2. Phân theo yếu tố gây chấn thương" rows={overview.byInjuryFactor} />
          <BreakdownTable title="3. Phân theo nghề nghiệp" rows={overview.byOccupation} />
        </Stack>
      </Card>
    </Stack>
  );
}
