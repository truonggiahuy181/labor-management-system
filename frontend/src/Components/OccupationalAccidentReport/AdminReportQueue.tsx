"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Chip,
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useSnackbar } from "notistack";
import useLocales from "@/Hooks/useLocales";
import TableFilterAutocomplete from "@/Components/TableFilterAutocomplete";
import {
  adminOccupationalAccidentReportApi,
  type AdminOccupationalAccidentReportListItem,
  type ReviewableOccupationalAccidentReportStatus,
} from "@/services/occupationalAccidentReport";
import { getErrorMessage } from "@/services/user";
import { getReportPeriodLabel } from "@/services/reportPeriod";

const STATUS: Record<
  ReviewableOccupationalAccidentReportStatus,
  { label: string; color: "primary" | "success" | "warning" }
> = {
  SUBMITTED: { label: "Chờ tiếp nhận", color: "primary" },
  RECEIVED: { label: "Đã tiếp nhận", color: "success" },
  RETURNED: { label: "Đã trả bổ sung", color: "warning" },
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

export default function AdminReportQueue() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const currentYear = new Date().getFullYear();
  const [rows, setRows] = useState<AdminOccupationalAccidentReportListItem[]>(
    [],
  );
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<number | "">(currentYear);
  const [status, setStatus] = useState<
    ReviewableOccupationalAccidentReportStatus | ""
  >("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const years = useMemo(
    () => Array.from({ length: 7 }, (_, index) => currentYear + 1 - index),
    [currentYear],
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      adminOccupationalAccidentReportApi
        .list({
          search: search.trim() || undefined,
          year: year || undefined,
          status: status || undefined,
          page: page + 1,
          pageSize,
        })
        .then((result) => {
          if (cancelled) return;
          setRows(result.data);
          setTotal(result.total);
        })
        .catch((error) => {
          if (!cancelled) {
            enqueueSnackbar(
              getErrorMessage(error, "Không tải được danh sách báo cáo."),
              { variant: "error" },
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enqueueSnackbar, page, pageSize, search, status, year]);

  return (
    <Stack spacing={1.5} sx={{ height: "calc(100vh - 48px)" }}>
      <Card square elevation={1} sx={{ px: 2, py: 1.25 }}>
        <Typography sx={{ mb: 1.5, fontWeight: 700 }}>
          Tiếp nhận báo cáo định kỳ tai nạn lao động
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Tên doanh nghiệp hoặc mã số thuế"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ minWidth: { md: 340 } }}
          />
          <Box sx={{ width: 160 }}>
            <TableFilterAutocomplete
              value={String(year)}
              ariaLabel="Năm báo cáo"
              options={[
                { value: "", label: "Tất cả" },
                ...years.map((value) => ({
                  value: String(value),
                  label: String(value),
                })),
              ]}
              onChange={(value) => {
                setYear(value === "" ? "" : Number(value));
                setPage(0);
              }}
            />
          </Box>
          <Box sx={{ width: 190 }}>
            <TableFilterAutocomplete
              value={status}
              ariaLabel="Trạng thái"
              options={[
                { value: "", label: "Tất cả" },
                ...Object.entries(STATUS).map(([value, config]) => ({
                  value,
                  label: config.label,
                })),
              ]}
              onChange={(value) => {
                setStatus(
                  value as ReviewableOccupationalAccidentReportStatus | "",
                );
                setPage(0);
              }}
            />
          </Box>
          <Tooltip title={translate("common.resetFilters")}>
            <span>
              <IconButton
                color="primary"
                disabled={!search && year === currentYear && !status}
                onClick={() => {
                  setSearch("");
                  setYear(currentYear);
                  setStatus("");
                  setPage(0);
                }}
                aria-label={translate("common.resetFilters")}
              >
                <RestartAltIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
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
          <Table stickyHeader size="small" sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80, fontWeight: 600 }}>
                  Thao tác
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tên doanh nghiệp</TableCell>
                <TableCell sx={{ width: 140, fontWeight: 600 }}>
                  Mã số thuế
                </TableCell>
                <TableCell sx={{ width: 120, fontWeight: 600 }}>Năm</TableCell>
                <TableCell sx={{ width: 170, fontWeight: 600 }}>
                  Kỳ báo cáo
                </TableCell>
                <TableCell sx={{ width: 190, fontWeight: 600 }}>
                  Thời điểm gửi
                </TableCell>
                <TableCell sx={{ width: 160, fontWeight: 600 }}>
                  Trạng thái
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Tooltip title="Xem và xử lý báo cáo">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() =>
                          router.push(`/accidents/labor-contracts/${row.id}`)
                        }
                        aria-label="Xem báo cáo"
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{row.enterpriseName}</TableCell>
                  <TableCell>{row.taxCode}</TableCell>
                  <TableCell>{row.reportYear}</TableCell>
                  <TableCell>{getReportPeriodLabel(row.periodCode)}</TableCell>
                  <TableCell>{formatDate(row.submittedAt)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={STATUS[row.status].label}
                      color={STATUS[row.status].color}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ py: 7, color: "text.secondary" }}
                  >
                    Không có báo cáo phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage=""
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(0);
          }}
        />
      </Card>
    </Stack>
  );
}
