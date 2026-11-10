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
import type { AdminOccupationalAccidentSummary } from "@/services/occupationalAccidentReport";
import {
  CLASSIFICATION_COLUMN_WIDTHS,
  CLASSIFICATION_HEADER_ROWS,
  CLASSIFICATION_METRIC_KEYS,
  formatClassificationValue,
  getClassificationGroups,
  getClassificationTotals,
} from "./summaryClassification";

export default function SummaryClassificationTable({
  summary,
}: {
  summary: AdminOccupationalAccidentSummary;
}) {
  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Typography sx={{ mb: 1.25, fontWeight: 700 }}>
        II. Phân loại TNLĐ
      </Typography>
      <TableContainer
        sx={{ border: 1, borderColor: "divider", overflowX: "auto" }}
      >
        <Table
          size="small"
          sx={{
            minWidth: 1900,
            tableLayout: "fixed",
            "& th, & td": {
              border: 1,
              borderColor: "divider",
              fontSize: 11,
              px: 0.75,
              py: 0.9,
              overflowWrap: "anywhere",
            },
            "& thead th": {
              bgcolor: "grey.50",
              textAlign: "center",
              verticalAlign: "middle",
              fontWeight: 600,
              lineHeight: 1.3,
            },
          }}
        >
          <colgroup>
            {CLASSIFICATION_COLUMN_WIDTHS.map((width, index) => (
              <col key={index} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <TableHead>
            {CLASSIFICATION_HEADER_ROWS.map((row, index) => (
              <TableRow key={index}>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={`${cellIndex}-${cell.label}`}
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                  >
                    {cell.label}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {getClassificationTotals(summary).map((row) => (
              <TableRow
                key={row.label}
                sx={
                  row.strong
                    ? { bgcolor: "grey.50", "& td": { fontWeight: 700 } }
                    : undefined
                }
              >
                <TableCell colSpan={2}>{row.label}</TableCell>
                <TableCell />
                {CLASSIFICATION_METRIC_KEYS.map((key) => (
                  <TableCell key={key} align="right">
                    {formatClassificationValue(row.value, key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {getClassificationGroups(summary).map((group) => (
            <TableBody
              key={group.key}
              sx={{ borderTop: 2, borderColor: "grey.400" }}
            >
              {group.rows.length ? (
                group.rows.map((row, index) => (
                  <TableRow key={row.id} hover>
                    {index === 0 && (
                      <TableCell
                        rowSpan={group.rows.length}
                        component="th"
                        scope="rowgroup"
                        sx={{ fontWeight: 600 }}
                      >
                        {group.label}
                      </TableCell>
                    )}
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="center">{row.code}</TableCell>
                    {CLASSIFICATION_METRIC_KEYS.map((key) => (
                      <TableCell key={key} align="right">
                        {formatClassificationValue(row, key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    component="th"
                    scope="rowgroup"
                    sx={{ fontWeight: 600 }}
                  >
                    {group.label}
                  </TableCell>
                  <TableCell colSpan={15} align="center">
                    Không phát sinh số liệu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          ))}
        </Table>
      </TableContainer>
    </Card>
  );
}
