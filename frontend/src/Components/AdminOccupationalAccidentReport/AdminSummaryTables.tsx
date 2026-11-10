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
  AccidentSummary,
  AdminOccupationalAccidentSummary,
  OccupationalAccidentBusinessTypeSummary,
} from "@/services/occupationalAccidentReport";
import { formatVnd } from "@/services/money";

const headCellSx = {
  bgcolor: "grey.50",
  borderColor: "divider",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.25,
  px: 0.75,
  py: 1,
  textAlign: "center",
  whiteSpace: "normal",
} as const;

const bodyCellSx = {
  borderColor: "divider",
  fontSize: 11,
  px: 0.75,
  py: 1,
} as const;

const frequency = (value: number, employees: number) =>
  employees > 0
    ? new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format((value * 1_000) / employees)
    : "0,00";

function GeneralRow({
  name,
  code,
  totalEnterpriseCount,
  enterpriseCount,
  totalEmployees,
  femaleEmployees,
  accidentSummary,
  total,
}: {
  name: string;
  code: string;
  totalEnterpriseCount: number;
  enterpriseCount: number;
  totalEmployees: number;
  femaleEmployees: number;
  accidentSummary: AccidentSummary;
  total?: boolean;
}) {
  const fontWeight = total ? 700 : 400;
  return (
    <TableRow hover={!total} sx={total ? { bgcolor: "grey.50" } : undefined}>
      <TableCell sx={{ ...bodyCellSx, minWidth: 230, fontWeight }}>
        {name}
      </TableCell>
      <TableCell sx={{ ...bodyCellSx, width: 80, fontWeight }}>
        {code}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {totalEnterpriseCount}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {enterpriseCount}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {totalEmployees}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {totalEmployees}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {femaleEmployees}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {accidentSummary.victimCount}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {accidentSummary.deathCount}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {accidentSummary.severeCount}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {frequency(accidentSummary.victimCount, totalEmployees)}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {frequency(accidentSummary.deathCount, totalEmployees)}
      </TableCell>
      <TableCell sx={{ ...bodyCellSx, minWidth: 130 }} />
    </TableRow>
  );
}

function GeneralInformationTable({
  summary,
}: {
  summary: AdminOccupationalAccidentSummary;
}) {
  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Typography sx={{ mb: 1.25, fontWeight: 700 }}>
        I. Thông tin tổng quan
      </Typography>
      <TableContainer sx={{ border: 1, borderColor: "divider" }}>
        <Table size="small" sx={{ minWidth: 1500, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={3} sx={{ ...headCellSx, width: 230 }}>
                Loại hình cơ sở
              </TableCell>
              <TableCell rowSpan={3} sx={{ ...headCellSx, width: 80 }}>
                Mã số
              </TableCell>
              <TableCell colSpan={2} sx={headCellSx}>
                Cơ sở
              </TableCell>
              <TableCell colSpan={3} sx={headCellSx}>
                Lực lượng lao động
              </TableCell>
              <TableCell colSpan={3} sx={headCellSx}>
                Tình hình tai nạn lao động
              </TableCell>
              <TableCell colSpan={2} sx={headCellSx}>
                Tần suất tai nạn lao động
              </TableCell>
              <TableCell rowSpan={3} sx={{ ...headCellSx, width: 130 }}>
                Ghi chú
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell rowSpan={2} sx={headCellSx}>
                Tổng số
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                Số cơ sở tham gia báo cáo
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                Tổng số lao động
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                Số lao động của cơ sở tham gia báo cáo
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                Số lao động nữ
              </TableCell>
              <TableCell colSpan={3} sx={headCellSx}>
                Số người bị TNLĐ
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                K TNLĐ (‰)
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                K chết (‰)
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headCellSx}>Tổng số</TableCell>
              <TableCell sx={headCellSx}>Số người chết</TableCell>
              <TableCell sx={headCellSx}>Số người bị thương nặng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <GeneralRow
              total
              name="Tổng số"
              code=""
              totalEnterpriseCount={summary.registeredEnterpriseCount}
              enterpriseCount={summary.enterpriseCount}
              totalEmployees={summary.totalEmployees}
              femaleEmployees={summary.femaleEmployees}
              accidentSummary={summary.overview.grandTotal}
            />
            {summary.byBusinessType.map(
              (row: OccupationalAccidentBusinessTypeSummary) => (
                <GeneralRow
                  key={row.code}
                  name={row.name}
                  code={row.code}
                  totalEnterpriseCount={row.totalEnterpriseCount}
                  enterpriseCount={row.enterpriseCount}
                  totalEmployees={row.totalEmployees}
                  femaleEmployees={row.femaleEmployees}
                  accidentSummary={row.accidentSummary}
                />
              ),
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1 }}
      >
        K TNLĐ và K chết được tính trên 1.000 lao động của các cơ sở có báo cáo
        đã tiếp nhận.
      </Typography>
    </Card>
  );
}

const metricCells = (row: AccidentSummary) => [
  row.totalCases,
  row.fatalCases,
  row.multiVictimCases,
  row.victimCount,
  row.femaleCount,
  row.deathCount,
  row.severeCount,
  row.lostWorkDays,
  formatVnd(row.medicalCostVnd),
  formatVnd(row.salaryCostVnd),
  formatVnd(row.compensationCostVnd),
  formatVnd(row.propertyDamageVnd),
];

function MetricsCells({ row, bold }: { row: AccidentSummary; bold?: boolean }) {
  return metricCells(row).map((value, index) => (
    <TableCell
      key={index}
      align="right"
      sx={{
        ...bodyCellSx,
        minWidth: index >= 8 ? 125 : 90,
        fontWeight: bold ? 700 : 400,
      }}
    >
      {value}
    </TableCell>
  ));
}

function BreakdownGroup({
  label,
  rows,
}: {
  label: string;
  rows: AccidentBreakdownRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map((row, index) => (
        <TableRow key={`${label}-${row.id}`} hover>
          {index === 0 && (
            <TableCell
              rowSpan={rows.length}
              sx={{ ...bodyCellSx, width: 150, fontWeight: 600 }}
            >
              {label}
            </TableCell>
          )}
          <TableCell sx={{ ...bodyCellSx, minWidth: 300 }}>
            {row.name}
          </TableCell>
          <TableCell sx={{ ...bodyCellSx, width: 80 }}>{row.code}</TableCell>
          <MetricsCells row={row} />
        </TableRow>
      ))}
    </>
  );
}

function ClassificationTable({
  summary,
}: {
  summary: AdminOccupationalAccidentSummary;
}) {
  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Typography sx={{ mb: 1.25, fontWeight: 700 }}>
        II. Phân loại tai nạn lao động
      </Typography>
      <TableContainer sx={{ border: 1, borderColor: "divider" }}>
        <Table size="small" sx={{ minWidth: 1900, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={3} sx={{ ...headCellSx, width: 150 }}>
                Nhóm phân loại
              </TableCell>
              <TableCell rowSpan={3} sx={{ ...headCellSx, width: 300 }}>
                Tên chỉ tiêu thống kê
              </TableCell>
              <TableCell rowSpan={3} sx={{ ...headCellSx, width: 80 }}>
                Mã số
              </TableCell>
              <TableCell colSpan={7} sx={headCellSx}>
                Phân loại TNLĐ theo mức độ thương tật
              </TableCell>
              <TableCell colSpan={5} sx={headCellSx}>
                Thiệt hại do tai nạn lao động
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell rowSpan={2} sx={headCellSx}>
                Tổng số vụ
              </TableCell>
              <TableCell colSpan={2} sx={headCellSx}>
                Số vụ TNLĐ
              </TableCell>
              <TableCell colSpan={4} sx={headCellSx}>
                Số người bị nạn (người)
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                Tổng số ngày nghỉ vì TNLĐ
              </TableCell>
              <TableCell colSpan={3} sx={headCellSx}>
                Tổng số tiền (VND)
              </TableCell>
              <TableCell rowSpan={2} sx={headCellSx}>
                Thiệt hại tài sản (VND)
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headCellSx}>Số vụ có người chết</TableCell>
              <TableCell sx={headCellSx}>
                Số vụ có từ 2 người bị nạn trở lên
              </TableCell>
              <TableCell sx={headCellSx}>Tổng số</TableCell>
              <TableCell sx={headCellSx}>Số lao động nữ</TableCell>
              <TableCell sx={headCellSx}>Số người chết</TableCell>
              <TableCell sx={headCellSx}>Số người bị thương nặng</TableCell>
              <TableCell sx={headCellSx}>Chi phí y tế</TableCell>
              <TableCell sx={headCellSx}>
                Trả lương trong thời gian điều trị
              </TableCell>
              <TableCell sx={headCellSx}>Bồi thường, trợ cấp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell colSpan={2} sx={{ ...bodyCellSx, fontWeight: 700 }}>
                Tổng số
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, fontWeight: 700 }} />
              <MetricsCells row={summary.overview.grandTotal} bold />
            </TableRow>
            <BreakdownGroup
              label="Phân theo ngành nghề"
              rows={summary.byIndustry}
            />
            <BreakdownGroup
              label="Phân theo nguyên nhân"
              rows={summary.overview.byCause}
            />
            <BreakdownGroup
              label="Phân theo yếu tố gây chấn thương"
              rows={summary.overview.byInjuryFactor}
            />
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

export default function AdminSummaryTables({
  summary,
}: {
  summary: AdminOccupationalAccidentSummary;
}) {
  return (
    <>
      <GeneralInformationTable summary={summary} />
      <ClassificationTable summary={summary} />
    </>
  );
}
