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
  AccidentSummary,
  AdminOccupationalAccidentSummary,
  OccupationalAccidentBusinessTypeSummary,
} from "@/services/occupationalAccidentReport";
import SummaryClassificationTable from "./SummaryClassificationTable";
import { formatReportFrequency } from "./status";

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

function GeneralRow({
  name,
  code,
  totalEnterpriseCount,
  enterpriseCount,
  totalEmployees,
  femaleEmployees,
  accidentSummary,
  accidentFrequencyPerThousand,
  fatalityFrequencyPerThousand,
  total,
}: {
  name: string;
  code: string;
  totalEnterpriseCount: number;
  enterpriseCount: number;
  totalEmployees: number;
  femaleEmployees: number;
  accidentSummary: AccidentSummary;
  accidentFrequencyPerThousand: number;
  fatalityFrequencyPerThousand: number;
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
        {formatReportFrequency(accidentFrequencyPerThousand)}
      </TableCell>
      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight }}>
        {formatReportFrequency(fatalityFrequencyPerThousand)}
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
              accidentFrequencyPerThousand={
                summary.accidentFrequencyPerThousand
              }
              fatalityFrequencyPerThousand={
                summary.fatalityFrequencyPerThousand
              }
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
                  accidentFrequencyPerThousand={
                    row.accidentFrequencyPerThousand
                  }
                  fatalityFrequencyPerThousand={
                    row.fatalityFrequencyPerThousand
                  }
                />
              ),
            )}
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
      <SummaryClassificationTable summary={summary} />
    </>
  );
}
