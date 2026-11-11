"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useSnackbar } from "notistack";
import { ADMIN_REPORT_STATUS } from "@/Components/AdminOccupationalAccidentReport/status";
import TableFilterAutocomplete from "@/Components/TableFilterAutocomplete";
import useAuth from "@/Hooks/useAuth";
import useLocations from "@/Hooks/useLocations";
import { hasRole } from "@/constants/roles";
import {
  adminOccupationalAccidentReportApi,
  type AdminOccupationalAccidentReportListItem,
  type ReviewableOccupationalAccidentReportStatus,
} from "@/services/occupationalAccidentReport";
import {
  getReportPeriodLabel,
  reportPeriodApi,
  type ReportPeriod,
} from "@/services/reportPeriod";
import { getErrorMessage } from "@/services/user";

// Mặc định xem doanh nghiệp tại TP. Hồ Chí Minh
const DEFAULT_PROVINCE_ID = "79";

// Ô lọc nằm ngay dưới tiêu đề cột (giống trang Quản lý doanh nghiệp)
const filterCell = {
  py: 1,
  px: 1,
  borderBottom: 1,
  borderColor: "divider",
  top: 37,
};

export default function AdminOccupationalAccidentReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = hasRole(user, "ADMIN");
  const locations = useLocations();
  const { ensureWards } = locations;
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [periodsLoaded, setPeriodsLoaded] = useState(false);
  const [rows, setRows] = useState<AdminOccupationalAccidentReportListItem[]>(
    [],
  );
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [year, setYear] = useState("");
  const [reportPeriodId, setReportPeriodId] = useState("");
  const [status, setStatus] = useState<
    ReviewableOccupationalAccidentReportStatus | ""
  >("");
  const [provinceId, setProvinceId] = useState(DEFAULT_PROVINCE_ID);
  const [wardId, setWardId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (provinceId) void ensureWards(provinceId);
  }, [ensureWards, provinceId]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    reportPeriodApi
      .list(false)
      .then((data) => {
        if (cancelled) return;
        const occupationalAccidentPeriods = data
          .filter((item) => item.reportTypeCode === "OCCUPATIONAL_ACCIDENT")
          .sort(
            (left, right) =>
              right.reportYear - left.reportYear ||
              right.submissionStartDate.localeCompare(left.submissionStartDate),
          );
        setPeriods(occupationalAccidentPeriods);
        setYear(
          (current) =>
            current || String(occupationalAccidentPeriods[0]?.reportYear ?? ""),
        );
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(
            getErrorMessage(error, "Không tải được danh sách kỳ báo cáo."),
            { variant: "error" },
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPeriodsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !periodsLoaded) return;
    let cancelled = false;
    adminOccupationalAccidentReportApi
      .list({
        ...(enterpriseName.trim() && { enterpriseName: enterpriseName.trim() }),
        ...(taxCode.trim() && { taxCode: taxCode.trim() }),
        ...(year && { year: Number(year) }),
        ...(reportPeriodId && { reportPeriodId: Number(reportPeriodId) }),
        ...(status && { status }),
        ...(provinceId && { provinceId }),
        ...(wardId && { wardId }),
        page,
        pageSize,
      })
      .then((result) => {
        if (!cancelled) {
          setRows(result.data);
          setTotal(result.total);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
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
  }, [
    enqueueSnackbar,
    enterpriseName,
    isAdmin,
    page,
    pageSize,
    periodsLoaded,
    provinceId,
    reportPeriodId,
    status,
    taxCode,
    wardId,
    year,
  ]);

  const years = useMemo(
    () =>
      [...new Set(periods.map((item) => item.reportYear))].sort(
        (left, right) => right - left,
      ),
    [periods],
  );
  const selectablePeriods = useMemo(
    () => periods.filter((item) => !year || item.reportYear === Number(year)),
    [periods, year],
  );

  // Đổi bộ lọc → về trang 1 và bỏ chọn các dòng cũ
  const updateFilter = (task: () => void) => {
    setLoading(true);
    setPage(1);
    setSelected([]);
    task();
  };

  const pageIds = rows.map((row) => row.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked =
    pageIds.some((id) => selected.includes(id)) && !allChecked;
  const toggleAll = () =>
    setSelected((current) =>
      allChecked
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])],
    );
  const toggleOne = (id: number) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const openSummary = () => {
    const query = new URLSearchParams();
    if (year) query.set("year", year);
    if (reportPeriodId) query.set("reportPeriodId", reportPeriodId);
    router.push(
      `/admin/occupational-accident-reports/summary${query.size ? `?${query}` : ""}`,
    );
  };

  if (user && !isAdmin) {
    return (
      <Typography color="text.secondary">
        Chức năng này chỉ dành cho quản trị viên.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ height: "calc(100vh - 48px)" }}>
      <Card
        square
        elevation={1}
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography sx={{ flex: 1, fontWeight: 700 }}>
          Báo cáo định kỳ tai nạn lao động
        </Typography>
        <TableFilterAutocomplete
          ariaLabel="Năm báo cáo"
          placeholder="Tất cả"
          value={year}
          options={years.map((item) => ({
            value: String(item),
            label: String(item),
          }))}
          onChange={(value) =>
            updateFilter(() => {
              setYear(value);
              setReportPeriodId("");
            })
          }
          sx={{ width: 130 }}
        />
        <Button variant="outlined" onClick={openSummary}>
          Báo cáo tổng hợp
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
            sx={{ position: "absolute", inset: "0 0 auto", zIndex: 4 }}
          />
        )}

        {/* Lọc theo địa bàn ĐKKD của doanh nghiệp */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ px: 1.5, pt: 2, pb: 2.5 }}
        >
          <TableFilterAutocomplete
            ariaLabel="Tỉnh/thành phố"
            label="Tỉnh/thành phố"
            placeholder="Tất cả"
            value={provinceId}
            options={locations.provinceOptions}
            onChange={(value) =>
              updateFilter(() => {
                setProvinceId(value);
                setWardId("");
              })
            }
            sx={{ flex: 1 }}
          />
          <TableFilterAutocomplete
            ariaLabel="Phường/xã"
            label="Phường/xã"
            placeholder="Tất cả"
            value={wardId}
            options={locations.wardsOf(provinceId)}
            onChange={(value) => updateFilter(() => setWardId(value))}
            sx={{ flex: 1 }}
          />
        </Stack>

        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 960 }}>
            <TableHead
              sx={{ "& .MuiTableCell-head": { bgcolor: "grey.100" } }}
            >
              <TableRow>
                <TableCell padding="checkbox" rowSpan={2}>
                  <Checkbox
                    size="small"
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={toggleAll}
                    slotProps={{
                      input: { "aria-label": "Chọn tất cả báo cáo" },
                    }}
                  />
                </TableCell>
                <TableCell rowSpan={2} sx={{ width: 90, fontWeight: 600 }}>
                  Thao tác
                </TableCell>
                <TableCell sx={{ minWidth: 300, fontWeight: 600 }}>
                  Tên doanh nghiệp
                </TableCell>
                <TableCell sx={{ width: 190, fontWeight: 600 }}>
                  Mã số thuế
                </TableCell>
                <TableCell sx={{ width: 190, fontWeight: 600 }}>
                  Kỳ báo cáo
                </TableCell>
                <TableCell sx={{ width: 190, fontWeight: 600 }}>
                  Trạng thái
                </TableCell>
              </TableRow>
              {/* Hàng ô lọc ngay dưới tiêu đề cột */}
              <TableRow>
                <TableCell sx={filterCell}>
                  <TextField
                    fullWidth
                    size="small"
                    value={enterpriseName}
                    onChange={(event) =>
                      updateFilter(() => setEnterpriseName(event.target.value))
                    }
                    slotProps={{
                      htmlInput: { "aria-label": "Tên doanh nghiệp" },
                    }}
                  />
                </TableCell>
                <TableCell sx={filterCell}>
                  <TextField
                    fullWidth
                    size="small"
                    value={taxCode}
                    onChange={(event) =>
                      updateFilter(() => setTaxCode(event.target.value))
                    }
                    slotProps={{ htmlInput: { "aria-label": "Mã số thuế" } }}
                  />
                </TableCell>
                <TableCell sx={filterCell}>
                  <TableFilterAutocomplete
                    ariaLabel="Kỳ báo cáo"
                    value={reportPeriodId}
                    options={selectablePeriods.map((item) => ({
                      value: String(item.id),
                      label: year
                        ? getReportPeriodLabel(item.periodCode)
                        : `${getReportPeriodLabel(item.periodCode)} ${item.reportYear}`,
                    }))}
                    onChange={(value) =>
                      updateFilter(() => setReportPeriodId(value))
                    }
                  />
                </TableCell>
                <TableCell sx={filterCell}>
                  <TableFilterAutocomplete
                    ariaLabel="Trạng thái"
                    value={status}
                    options={Object.entries(ADMIN_REPORT_STATUS).map(
                      ([value, meta]) => ({ value, label: meta.label }),
                    )}
                    onChange={(value) =>
                      updateFilter(() =>
                        setStatus(
                          value as ReviewableOccupationalAccidentReportStatus | "",
                        ),
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const statusMeta = ADMIN_REPORT_STATUS[row.status];
                const checked = selected.includes(row.id);
                return (
                  <TableRow key={row.id} hover selected={checked}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={checked}
                        onChange={() => toggleOne(row.id)}
                        slotProps={{
                          input: {
                            "aria-label": `Chọn báo cáo ${row.enterpriseName}`,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Xem báo cáo">
                        <IconButton
                          size="small"
                          onClick={() =>
                            router.push(
                              `/admin/occupational-accident-reports/${row.id}`,
                            )
                          }
                          aria-label="Xem báo cáo"
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.enterpriseName}</TableCell>
                    <TableCell>{row.taxCode}</TableCell>
                    <TableCell>
                      {getReportPeriodLabel(row.periodCode)}
                      {!year && ` ${row.reportYear}`}
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: `${statusMeta.color}.main`,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ color: `${statusMeta.color}.main` }}
                        >
                          {statusMeta.label}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
          page={Math.max(0, page - 1)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage=""
          labelDisplayedRows={({ from, to, count }) =>
            `${from} - ${to} / ${count}`
          }
          onPageChange={(_, nextPage) => {
            setLoading(true);
            setSelected([]);
            setPage(nextPage + 1);
          }}
          onRowsPerPageChange={(event) => {
            setLoading(true);
            setSelected([]);
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          sx={{ borderTop: 1, borderColor: "divider" }}
        />
      </Card>
    </Stack>
  );
}
