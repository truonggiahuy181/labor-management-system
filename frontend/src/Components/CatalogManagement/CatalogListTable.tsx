"use client";

import type { ReactNode } from "react";
import {
  Button,
  Card,
  Checkbox,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import BulkActionBar from "@/Components/BulkActionBar";
import useLocales from "@/Hooks/useLocales";

export interface CatalogColumn<Row> {
  key: string;
  label: string;
  width?: number | string;
  filter: ReactNode;
  render: (row: Row) => ReactNode;
}

interface CatalogListTableProps<Row extends { id: number }> {
  title: string;
  rows: Row[];
  loading: boolean;
  columns: CatalogColumn<Row>[];
  selected: number[];
  page: number;
  pageSize: number;
  deleting?: boolean;
  onSelectedChange: (ids: number[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onAdd: () => void;
  onEdit: (row: Row) => void;
  onDelete: () => void;
  onResetFilters: () => void;
  resetFiltersDisabled?: boolean;
  height?: string;
}

export default function CatalogListTable<Row extends { id: number }>({
  title,
  rows,
  loading,
  columns,
  selected,
  page,
  pageSize,
  deleting,
  onSelectedChange,
  onPageChange,
  onPageSizeChange,
  onAdd,
  onEdit,
  onDelete,
  onResetFilters,
  resetFiltersDisabled,
  height = "calc(100vh - 48px)",
}: CatalogListTableProps<Row>) {
  const { translate } = useLocales();
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const pageIds = pageRows.map((row) => row.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked =
    pageIds.some((id) => selected.includes(id)) && !allChecked;

  const toggleAll = () =>
    onSelectedChange(
      allChecked
        ? selected.filter((id) => !pageIds.includes(id))
        : [...new Set([...selected, ...pageIds])],
    );
  const toggleOne = (id: number) =>
    onSelectedChange(
      selected.includes(id)
        ? selected.filter((selectedId) => selectedId !== id)
        : [...selected, id],
    );

  return (
    <Stack spacing={2} sx={{ height }}>
      <Card
        square
        elevation={1}
        sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}
      >
        <Typography sx={{ flex: 1, fontWeight: 700 }}>{title}</Typography>
        <Tooltip title={translate("common.resetFilters")}>
          <span>
            <IconButton
              color="primary"
              onClick={onResetFilters}
              disabled={resetFiltersDisabled}
              aria-label={translate("common.resetFilters")}
            >
              <RestartAltIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          {translate("users.add")}
        </Button>
      </Card>

      <Card
        square
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {loading && (
          <LinearProgress
            sx={{ position: "absolute", inset: "0 0 auto", zIndex: 3 }}
          />
        )}
        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" rowSpan={2}>
                  <Checkbox
                    size="small"
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell rowSpan={2} sx={{ width: 72, fontWeight: 600 }}>
                  {translate("businessRegister.actions")}
                </TableCell>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    sx={{
                      width: column.width,
                      minWidth: column.width,
                      fontWeight: 600,
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} sx={{ px: 1, py: 1, top: 37 }}>
                    {column.filter}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={selected.includes(row.id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleOne(row.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={translate("users.edit")}>
                      <IconButton
                        size="small"
                        onClick={() => onEdit(row)}
                        aria-label={translate("users.edit")}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.key}>{column.render(row)}</TableCell>
                  ))}
                </TableRow>
              ))}
              {!loading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 2}
                    align="center"
                    sx={{ py: 6, color: "text.secondary" }}
                  >
                    {translate("users.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage=""
          labelDisplayedRows={({ from, to, count }) =>
            translate("users.of", { from, to, count })
          }
          onPageChange={(_, nextPage) => onPageChange(nextPage)}
          onRowsPerPageChange={(event) =>
            onPageSizeChange(Number(event.target.value))
          }
          sx={{ borderTop: 1, borderColor: "divider" }}
        />
      </Card>

      <BulkActionBar
        count={selected.length}
        deleting={deleting}
        onDelete={onDelete}
        onClear={() => onSelectedChange([])}
      />
    </Stack>
  );
}
