'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useSnackbar } from 'notistack';
import ReportTables from '@/Components/AdminOccupationalAccidentReport/ReportTables';
import { formatReportMoney } from '@/Components/AdminOccupationalAccidentReport/status';
import useAuth from '@/Hooks/useAuth';
import { ROLE } from '@/constants/roles';
import {
  adminOccupationalAccidentReportApi,
  type AdminOccupationalAccidentSummary,
} from '@/services/occupationalAccidentReport';
import { getReportPeriodLabel, reportPeriodApi, type ReportPeriod } from '@/services/reportPeriod';
import { getErrorMessage } from '@/services/user';

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>{value}</Typography>
    </Card>
  );
}

export default function AdminOccupationalAccidentSummaryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = user?.roleId === ROLE.ADMIN;
  const yearParam = searchParams.get('year');
  const periodParam = searchParams.get('reportPeriodId');
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : undefined;
  const reportPeriodId = periodParam && /^\d+$/.test(periodParam) ? Number(periodParam) : undefined;
  const [summary, setSummary] = useState<AdminOccupationalAccidentSummary | null>(null);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    Promise.all([
      adminOccupationalAccidentReportApi.summary({ year, reportPeriodId }),
      reportPeriodApi.list(true),
    ])
      .then(([nextSummary, nextPeriods]) => {
        if (!cancelled) {
          setSummary(nextSummary);
          setPeriods(nextPeriods);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(getErrorMessage(error, 'Không tải được báo cáo tổng hợp.'), { variant: 'error' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enqueueSnackbar, isAdmin, reportPeriodId, year]);

  const period = useMemo(
    () => periods.find((item) => item.id === reportPeriodId),
    [periods, reportPeriodId],
  );
  const scopeLabel = period
    ? `${getReportPeriodLabel(period.periodCode)} ${period.reportYear}`
    : year
      ? `Năm ${year}`
      : 'Tất cả các kỳ';

  if (user && !isAdmin) {
    return <Alert severity="warning">Chức năng này chỉ dành cho quản trị viên.</Alert>;
  }
  if (loading) return <LinearProgress />;
  if (!summary) return <Alert severity="error">Không tải được báo cáo tổng hợp.</Alert>;

  return (
    <Stack spacing={1.5} className="print-document">
      <Card square elevation={1} className="no-print" sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton size="small" onClick={() => router.push('/admin/occupational-accident-reports')} aria-label="Quay lại">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Báo cáo tổng hợp tai nạn lao động</Typography>
          <Typography variant="body2" color="text.secondary">{scopeLabel}</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
          In báo cáo
        </Button>
      </Card>

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Báo cáo tổng hợp tình hình tai nạn lao động</Typography>
        <Typography color="text.secondary">Phạm vi tổng hợp: {scopeLabel}. Chỉ bao gồm báo cáo đã tiếp nhận.</Typography>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1.5 }}>
        <MetricCard label="Báo cáo đã tiếp nhận" value={summary.reportCount} />
        <MetricCard label="Doanh nghiệp" value={summary.enterpriseCount} />
        <MetricCard label="Tổng số lao động" value={summary.totalEmployees} />
        <MetricCard label="Lao động nữ" value={summary.femaleEmployees} />
        <MetricCard label="Tổng quỹ lương (VND)" value={formatReportMoney(summary.payrollFundVnd)} />
      </Box>

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 2, fontWeight: 700 }}>I. Thông tin tổng quan theo loại hình cơ sở</Typography>
        <TableContainer sx={{ border: 1, borderColor: 'divider' }}>
          <Table size="small" sx={{ minWidth: 1180 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 260, fontWeight: 600 }}>Loại hình cơ sở</TableCell>
                <TableCell sx={{ width: 90, fontWeight: 600 }}>Mã số</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Cơ sở tham gia</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Tổng lao động</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Lao động nữ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Tổng số vụ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Số người bị nạn</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Số người chết</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Thương nặng</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Tổng chi phí (VND)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.byBusinessType.map((row) => (
                <TableRow key={row.code} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell align="right">{row.enterpriseCount}</TableCell>
                  <TableCell align="right">{row.totalEmployees}</TableCell>
                  <TableCell align="right">{row.femaleEmployees}</TableCell>
                  <TableCell align="right">{row.accidentSummary.totalCases}</TableCell>
                  <TableCell align="right">{row.accidentSummary.victimCount}</TableCell>
                  <TableCell align="right">{row.accidentSummary.deathCount}</TableCell>
                  <TableCell align="right">{row.accidentSummary.severeCount}</TableCell>
                  <TableCell align="right">{formatReportMoney(row.accidentSummary.totalCostVnd)}</TableCell>
                </TableRow>
              ))}
              {summary.byBusinessType.length === 0 && (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 5, color: 'text.secondary' }}>Chưa có báo cáo đã tiếp nhận trong phạm vi đã chọn.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ReportTables overview={summary.overview} />
    </Stack>
  );
}
