'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Chip,
  IconButton,
  LinearProgress,
  MenuItem,
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
} from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useSnackbar } from 'notistack';
import {
  ADMIN_REPORT_STATUS,
  formatReportDateTime,
} from '@/Components/AdminOccupationalAccidentReport/status';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import {
  adminOccupationalAccidentReportApi,
  type AdminOccupationalAccidentReportListItem,
  type ReviewableOccupationalAccidentReportStatus,
} from '@/services/occupationalAccidentReport';
import { reportPeriodApi, type ReportPeriod } from '@/services/reportPeriod';
import { getErrorMessage } from '@/services/user';

export default function AdminOccupationalAccidentReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const isAdmin = user?.roleId === ROLE.ADMIN;
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [periodsLoaded, setPeriodsLoaded] = useState(false);
  const [rows, setRows] = useState<AdminOccupationalAccidentReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [reportPeriodId, setReportPeriodId] = useState('');
  const [status, setStatus] = useState<ReviewableOccupationalAccidentReportStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    reportPeriodApi.list(false)
      .then((data) => {
        if (cancelled) return;
        const occupationalAccidentPeriods = data
          .filter((item) => item.reportTypeCode === 'OCCUPATIONAL_ACCIDENT')
          .sort((left, right) => right.reportYear - left.reportYear || right.startDate.localeCompare(left.startDate));
        setPeriods(occupationalAccidentPeriods);
        setYear((current) => current || String(occupationalAccidentPeriods[0]?.reportYear ?? ''));
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(getErrorMessage(error, 'Không tải được danh sách kỳ báo cáo.'), { variant: 'error' });
        }
      })
      .finally(() => {
        if (!cancelled) setPeriodsLoaded(true);
      });
    return () => { cancelled = true; };
  }, [enqueueSnackbar, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !periodsLoaded) return;
    let cancelled = false;
    adminOccupationalAccidentReportApi.list({
      ...(search.trim() && { search: search.trim() }),
      ...(year && { year: Number(year) }),
      ...(reportPeriodId && { reportPeriodId: Number(reportPeriodId) }),
      ...(status && { status }),
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
          enqueueSnackbar(getErrorMessage(error, 'Không tải được danh sách báo cáo.'), { variant: 'error' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enqueueSnackbar, isAdmin, page, pageSize, periodsLoaded, reportPeriodId, search, status, year]);

  const years = useMemo(
    () => [...new Set(periods.map((item) => item.reportYear))].sort((left, right) => right - left),
    [periods],
  );
  const selectablePeriods = useMemo(
    () => periods.filter((item) => !year || item.reportYear === Number(year)),
    [periods, year],
  );

  const updateFilter = (task: () => void) => {
    setLoading(true);
    setPage(1);
    task();
  };

  const resetFilters = () => {
    setLoading(true);
    setSearch('');
    setYear('');
    setReportPeriodId('');
    setStatus('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || year || reportPeriodId || status);

  const openSummary = () => {
    const query = new URLSearchParams();
    if (year) query.set('year', year);
    if (reportPeriodId) query.set('reportPeriodId', reportPeriodId);
    router.push(`/admin/occupational-accident-reports/summary${query.size ? `?${query}` : ''}`);
  };

  if (user && !isAdmin) {
    return <Typography color="text.secondary">Chức năng này chỉ dành cho quản trị viên.</Typography>;
  }

  return (
    <Stack spacing={1.5} sx={{ height: 'calc(100vh - 48px)' }}>
      <Card square elevation={1} sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>Báo cáo định kỳ tai nạn lao động</Typography>
        <TextField
          select
          size="small"
          label="Năm báo cáo"
          value={year}
          onChange={(event) => updateFilter(() => {
            setYear(event.target.value);
            setReportPeriodId('');
          })}
          sx={{ width: 145 }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {years.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
        <Tooltip title={translate('common.resetFilters')}>
          <span>
            <IconButton
              color="primary"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              aria-label={translate('common.resetFilters')}
            >
              <RestartAltIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button variant="contained" startIcon={<AssessmentOutlinedIcon />} onClick={openSummary}>
          Báo cáo tổng hợp
        </Button>
      </Card>

      <Card square sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {loading && <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', zIndex: 4 }} />}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            label="Tên doanh nghiệp hoặc mã số thuế"
            value={search}
            onChange={(event) => updateFilter(() => setSearch(event.target.value))}
            sx={{ flex: 1, minWidth: 260 }}
          />
          <TextField
            select
            size="small"
            label="Kỳ báo cáo"
            value={reportPeriodId}
            onChange={(event) => updateFilter(() => setReportPeriodId(event.target.value))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {selectablePeriods.map((item) => (
              <MenuItem key={item.id} value={item.id}>{item.reportPeriod}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Trạng thái"
            value={status}
            onChange={(event) => updateFilter(() => setStatus(event.target.value as ReviewableOccupationalAccidentReportStatus | ''))}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(ADMIN_REPORT_STATUS).map(([value, meta]) => (
              <MenuItem key={value} value={value}>{meta.label}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1040 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 82, fontWeight: 600 }}>Thao tác</TableCell>
                <TableCell sx={{ minWidth: 300, fontWeight: 600 }}>Tên doanh nghiệp</TableCell>
                <TableCell sx={{ width: 160, fontWeight: 600 }}>Mã số thuế</TableCell>
                <TableCell sx={{ width: 180, fontWeight: 600 }}>Kỳ báo cáo</TableCell>
                <TableCell sx={{ width: 170, fontWeight: 600 }}>Ngày gửi</TableCell>
                <TableCell sx={{ width: 180, fontWeight: 600 }}>Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const statusMeta = ADMIN_REPORT_STATUS[row.status];
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Tooltip title="Xem báo cáo">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => router.push(`/admin/occupational-accident-reports/${row.id}`)}
                          aria-label="Xem báo cáo"
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.enterpriseName}</TableCell>
                    <TableCell>{row.taxCode}</TableCell>
                    <TableCell>{row.reportPeriod} {row.reportYear}</TableCell>
                    <TableCell>{formatReportDateTime(row.submittedAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={statusMeta.label} color={statusMeta.color} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 7, color: 'text.secondary' }}>
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
          labelDisplayedRows={({ from, to, count }) => `${from} - ${to} / ${count}`}
          onPageChange={(_, nextPage) => {
            setLoading(true);
            setPage(nextPage + 1);
          }}
          onRowsPerPageChange={(event) => {
            setLoading(true);
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Card>
    </Stack>
  );
}
