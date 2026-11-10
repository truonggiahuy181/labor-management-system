"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Autocomplete,
  Card,
  Chip,
  CircularProgress,
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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useSnackbar } from "notistack";
import useAuth from "@/Hooks/useAuth";
import useLocales from "@/Hooks/useLocales";
import { hasRole } from "@/constants/roles";
import {
  occupationalAccidentReportApi,
  type OccupationalAccidentReportListItem,
  type OccupationalAccidentReportStatus,
} from "@/services/occupationalAccidentReport";
import { getErrorMessage } from "@/services/user";
import { getReportPeriodLabel } from "@/services/reportPeriod";

const STATUS: Record<
  OccupationalAccidentReportStatus,
  {
    label: string;
    color: "default" | "info" | "primary" | "success" | "warning";
  }
> = {
  NOT_STARTED: { label: "Chưa khai báo", color: "default" },
  DRAFT: { label: "Đang khai báo", color: "info" },
  SUBMITTED: { label: "Đã gửi", color: "primary" },
  RECEIVED: { label: "Đã tiếp nhận", color: "success" },
  RETURNED: { label: "Yêu cầu bổ sung", color: "warning" },
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export default function OccupationalAccidentReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { translate } = useLocales();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<OccupationalAccidentReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPeriodId, setOpeningPeriodId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const isEnterprise = hasRole(user, 'ENTERPRISE');
  const isAdmin = hasRole(user, 'ADMIN');

  // Admin duyệt báo cáo ở màn hình riêng (cũng là mục trên menu)
  useEffect(() => {
    if (isAdmin) router.replace("/admin/occupational-accident-reports");
  }, [isAdmin, router]);

  const years = useMemo(
    () => Array.from({ length: 7 }, (_, index) => currentYear + 1 - index),
    [currentYear],
  );

  useEffect(() => {
    if (!isEnterprise) return;
    let cancelled = false;
    occupationalAccidentReportApi
      .listMine(year)
      .then((data) => {
        if (!cancelled) setRows(data);
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
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar, isEnterprise, year]);

  const openReport = async (row: OccupationalAccidentReportListItem) => {
    if (row.id) {
      router.push(`/accidents/labor-contracts/${row.id}`);
      return;
    }
    if (!row.isSubmissionOpen) {
      enqueueSnackbar("Kỳ báo cáo chưa mở hoặc đã đóng.", {
        variant: "warning",
      });
      return;
    }
    setOpeningPeriodId(row.reportPeriodId);
    try {
      const report = await occupationalAccidentReportApi.createDraft(
        row.reportPeriodId,
      );
      router.push(`/accidents/labor-contracts/${report.id}`);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Không thể khởi tạo báo cáo."), {
        variant: "error",
      });
      setOpeningPeriodId(null);
    }
  };

  if (authLoading || isAdmin) return <LinearProgress />;
  if (!isEnterprise) {
    return (
      <Typography color="text.secondary">
        Chức năng này dành cho tài khoản doanh nghiệp.
      </Typography>
    );
  }

  const safePage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / pageSize) - 1),
  );
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return (
    <Stack spacing={1.5} sx={{ height: "calc(100vh - 48px)" }}>
      <Card
        square
        elevation={1}
        sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 2 }}
      >
        <Typography sx={{ flex: 1, fontWeight: 700 }}>
          Báo cáo định kỳ tai nạn lao động
        </Typography>
        <Autocomplete
          size="small"
          options={years}
          value={year}
          onChange={(_, value) => {
            if (value === null) return;
            setLoading(true);
            setYear(value);
            setPage(0);
          }}
          sx={{ width: 150 }}
          renderInput={(params) => (
            <TextField {...params} label="Năm báo cáo" />
          )}
        />
        <Tooltip title={translate("common.resetFilters")}>
          <span>
            <IconButton
              color="primary"
              disabled={year === currentYear}
              onClick={() => {
                setLoading(true);
                setYear(currentYear);
                setPage(0);
              }}
              aria-label={translate("common.resetFilters")}
            >
              <RestartAltIcon />
            </IconButton>
          </span>
        </Tooltip>
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
          <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 92, fontWeight: 600 }}>
                  Thao tác
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tên báo cáo</TableCell>
                <TableCell sx={{ width: 110, fontWeight: 600 }}>Năm</TableCell>
                <TableCell sx={{ width: 180, fontWeight: 600 }}>
                  Kỳ báo cáo
                </TableCell>
                <TableCell sx={{ width: 220, fontWeight: 600 }}>
                  Thời gian nhận báo cáo
                </TableCell>
                <TableCell sx={{ width: 170, fontWeight: 600 }}>
                  Trạng thái
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row) => {
                const readOnly =
                  row.status === "SUBMITTED" || row.status === "RECEIVED";
                const opening = openingPeriodId === row.reportPeriodId;
                return (
                  <TableRow key={row.reportPeriodId} hover>
                    <TableCell>
                      <Tooltip title={readOnly ? "Xem báo cáo" : "Khai báo"}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={
                              opening || (!row.id && !row.isSubmissionOpen)
                            }
                            onClick={() => openReport(row)}
                            aria-label={readOnly ? "Xem báo cáo" : "Khai báo"}
                          >
                            {opening ? (
                              <CircularProgress size={18} />
                            ) : readOnly ? (
                              <VisibilityOutlinedIcon fontSize="small" />
                            ) : (
                              <EditOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.reportName}</TableCell>
                    <TableCell>{row.reportYear}</TableCell>
                    <TableCell>{getReportPeriodLabel(row.periodCode)}</TableCell>
                    <TableCell>
                      {formatDate(row.submissionStartDate)} – {formatDate(row.submissionEndDate)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={STATUS[row.status].label}
                        color={STATUS[row.status].color}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 7, color: "text.secondary" }}
                  >
                    Chưa có kỳ báo cáo trong năm đã chọn.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          page={safePage}
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
