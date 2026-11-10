"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EditIcon from "@mui/icons-material/Edit";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useSnackbar } from "notistack";
import ReportPeriodFormDialog from "@/Components/ReportPeriodManagement/ReportPeriodFormDialog";
import TableFilterAutocomplete from "@/Components/TableFilterAutocomplete";
import useAuth from "@/Hooks/useAuth";
import useLocales from "@/Hooks/useLocales";
import { hasRole } from "@/constants/roles";
import {
  getReportPeriodLabel,
  reportPeriodApi,
  type ReportPeriod,
} from "@/services/reportPeriod";
import { getErrorMessage } from "@/services/user";

type Filters = {
  reportYear: string;
  reportName: string;
  periodCode: string;
  submissionStartDate: string;
  submissionEndDate: string;
  isActive: string;
};

const EMPTY_FILTERS: Filters = {
  reportYear: "",
  reportName: "",
  periodCode: "",
  submissionStartDate: "",
  submissionEndDate: "",
  isActive: "",
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatDateFilterInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const toIsoDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return "";

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  )
    return "";

  return `${year}-${month}-${day}`;
};

function DateFilterField({
  value,
  ariaLabel,
  onChange,
  sx,
}: {
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  sx: object;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  };

  return (
    <TextField
      fullWidth
      size="small"
      value={value}
      placeholder="dd/mm/yyyy"
      onChange={(event) => onChange(formatDateFilterInput(event.target.value))}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                aria-label={ariaLabel}
                onClick={openPicker}
              >
                <CalendarMonthIcon fontSize="small" />
              </IconButton>
              <input
                ref={pickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={toIsoDate(value)}
                onChange={(event) => onChange(formatDate(event.target.value))}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
            </InputAdornment>
          ),
        },
        htmlInput: {
          "aria-label": ariaLabel,
          inputMode: "numeric",
          maxLength: 10,
        },
      }}
      sx={sx}
    />
  );
}

export default function ReportPeriodsPage() {
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = hasRole(user, 'ADMIN');
  const [rows, setRows] = useState<ReportPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReportPeriod | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    reportPeriodApi
      .list(true)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(
            getErrorMessage(error, translate("reportPeriods.loadFailed")),
            { variant: "error" },
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar, isAdmin, reloadCount, translate]);

  const reportNames = useMemo(
    () =>
      [...new Set(rows.map((row) => row.reportName))].sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    [rows],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!filters.reportYear ||
            String(row.reportYear).includes(filters.reportYear.trim())) &&
          (!filters.reportName || row.reportName === filters.reportName) &&
          (!filters.periodCode || row.periodCode === filters.periodCode) &&
          (!filters.submissionStartDate ||
            formatDate(row.submissionStartDate).startsWith(
              filters.submissionStartDate,
            )) &&
          (!filters.submissionEndDate ||
            formatDate(row.submissionEndDate).startsWith(
              filters.submissionEndDate,
            )) &&
          (!filters.isActive || String(row.isActive) === filters.isActive),
      ),
    [filters, rows],
  );

  const lastPage = Math.max(0, Math.ceil(filteredRows.length / pageSize) - 1);
  const safePage = Math.min(page, lastPage);
  const pageRows = filteredRows.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const toggleStatus = async (row: ReportPeriod, isActive: boolean) => {
    setUpdatingStatus(row.id);
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, isActive } : item,
      ),
    );
    try {
      await reportPeriodApi.updateStatus(row.id, isActive);
    } catch (error) {
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, isActive: row.isActive } : item,
        ),
      );
      enqueueSnackbar(
        getErrorMessage(error, translate("common.unknownError")),
        { variant: "error" },
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: ReportPeriod) => {
    setEditing(row);
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);
  const handleSaved = () => {
    setFormOpen(false);
    setLoading(true);
    setReloadCount((count) => count + 1);
  };

  if (user && !isAdmin) {
    return (
      <Typography color="text.secondary">
        {translate("users.adminOnly")}
      </Typography>
    );
  }

  const filterFieldSx = {
    minWidth: 120,
    "& .MuiInputBase-root": { bgcolor: "background.paper" },
  };

  return (
    <>
      <Stack spacing={2} sx={{ height: "calc(100vh - 48px)" }}>
        <Card
          square
          elevation={1}
          sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}
        >
          <Typography sx={{ flex: 1, fontWeight: 700 }}>
            {translate("reportPeriods.title")}
          </Typography>
          <Tooltip title={translate("common.resetFilters")}>
            <span>
              <IconButton
                color="primary"
                disabled={!Object.values(filters).some(Boolean)}
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setPage(0);
                }}
                aria-label={translate("common.resetFilters")}
              >
                <RestartAltIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            {translate("users.add")}
          </Button>
        </Card>

        <Card
          square
          sx={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {loading && (
            <LinearProgress
              sx={{ position: "absolute", inset: "0 0 auto", zIndex: 4 }}
            />
          )}
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1040 }}>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ width: 76, fontWeight: 600 }}>
                    {translate("businessRegister.actions")}
                  </TableCell>
                  <TableCell sx={{ width: 135, fontWeight: 600 }}>
                    {translate("reportPeriods.reportYear")}
                  </TableCell>
                  <TableCell sx={{ minWidth: 300, fontWeight: 600 }}>
                    {translate("reportPeriods.reportName")}
                  </TableCell>
                  <TableCell sx={{ width: 180, fontWeight: 600 }}>
                    {translate("reportPeriods.reportPeriod")}
                  </TableCell>
                  <TableCell sx={{ width: 170, fontWeight: 600 }}>
                    {translate("reportPeriods.startDate")}
                  </TableCell>
                  <TableCell sx={{ width: 170, fontWeight: 600 }}>
                    {translate("reportPeriods.endDate")}
                  </TableCell>
                  <TableCell sx={{ width: 140, fontWeight: 600 }}>
                    {translate("reportPeriods.status")}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={filters.reportYear}
                      onChange={(event) =>
                        setFilter("reportYear", event.target.value)
                      }
                      slotProps={{
                        htmlInput: {
                          "aria-label": translate("reportPeriods.reportYear"),
                          min: 2000,
                          max: 2100,
                        },
                      }}
                      sx={filterFieldSx}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TableFilterAutocomplete
                      value={filters.reportName}
                      options={reportNames.map((name) => ({
                        value: name,
                        label: name,
                      }))}
                      ariaLabel={translate("reportPeriods.reportName")}
                      onChange={(value) => setFilter("reportName", value)}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TableFilterAutocomplete
                      value={filters.periodCode}
                      options={[
                        {
                          value: "FIRST_HALF",
                          label: getReportPeriodLabel("FIRST_HALF"),
                        },
                        {
                          value: "ANNUAL",
                          label: getReportPeriodLabel("ANNUAL"),
                        },
                        {
                          value: "CUSTOM",
                          label: getReportPeriodLabel("CUSTOM"),
                        },
                      ]}
                      ariaLabel={translate("reportPeriods.reportPeriod")}
                      onChange={(value) => setFilter("periodCode", value)}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <DateFilterField
                      value={filters.submissionStartDate}
                      ariaLabel={translate("reportPeriods.startDate")}
                      onChange={(value) =>
                        setFilter("submissionStartDate", value)
                      }
                      sx={filterFieldSx}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <DateFilterField
                      value={filters.submissionEndDate}
                      ariaLabel={translate("reportPeriods.endDate")}
                      onChange={(value) =>
                        setFilter("submissionEndDate", value)
                      }
                      sx={filterFieldSx}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TableFilterAutocomplete
                      value={filters.isActive}
                      options={[
                        {
                          value: "true",
                          label: translate("reportPeriods.active"),
                        },
                        {
                          value: "false",
                          label: translate("reportPeriods.inactive"),
                        },
                      ]}
                      ariaLabel={translate("reportPeriods.status")}
                      onChange={(value) => setFilter("isActive", value)}
                    />
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Tooltip title={translate("users.edit")}>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(row)}
                          aria-label={translate("users.edit")}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.reportYear}</TableCell>
                    <TableCell>{row.reportName}</TableCell>
                    <TableCell>
                      {getReportPeriodLabel(row.periodCode)}
                    </TableCell>
                    <TableCell>{formatDate(row.submissionStartDate)}</TableCell>
                    <TableCell>{formatDate(row.submissionEndDate)}</TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={row.isActive}
                        disabled={updatingStatus === row.id}
                        onChange={(event) =>
                          toggleStatus(row, event.target.checked)
                        }
                        slotProps={{
                          input: {
                            "aria-label": translate("reportPeriods.status"),
                          },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && pageRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 7, color: "text.secondary" }}
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
            count={filteredRows.length}
            page={safePage}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage=""
            labelDisplayedRows={({ from, to, count }) =>
              translate("users.of", { from, to, count })
            }
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            sx={{ borderTop: 1, borderColor: "divider" }}
          />
        </Card>
      </Stack>

      <ReportPeriodFormDialog
        open={formOpen}
        item={editing}
        reportNames={reportNames}
        onClose={closeForm}
        onSaved={handleSaved}
      />
    </>
  );
}
