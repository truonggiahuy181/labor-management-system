'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useSnackbar } from 'notistack';
import {
  adminOccupationalAccidentReportApi,
  getOccupationalAccidentCoverage,
  type OccupationalAccidentOverview,
  type OccupationalAccidentReport,
  type OccupationalAccidentReportStatus,
  type ReviewableOccupationalAccidentReportStatus,
} from '@/services/occupationalAccidentReport';
import { getErrorMessage } from '@/services/user';
import SignedDocumentPanel from '@/Components/OccupationalAccidentReport/SignedDocumentPanel';
import { printOccupationalAccidentReport } from '@/Components/OccupationalAccidentReport/reportPrint';
import ReportTables from './ReportTables';
import {
  ADMIN_REPORT_STATUS,
  formatReportDate,
  formatReportDateTime,
  formatReportMoney,
} from './status';

const statusLabel = (status: OccupationalAccidentReportStatus | null) => {
  if (!status) return 'Khởi tạo';
  if (status === 'DRAFT') return 'Bản nháp';
  if (status === 'NOT_STARTED') return 'Chưa khai báo';
  return ADMIN_REPORT_STATUS[status].label;
};

export default function AdminReportReview({ reportId }: { reportId: number }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [report, setReport] = useState<OccupationalAccidentReport | null>(null);
  const [overview, setOverview] = useState<OccupationalAccidentOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminOccupationalAccidentReportApi.get(reportId),
      adminOccupationalAccidentReportApi.overview(reportId),
    ])
      .then(([nextReport, nextOverview]) => {
        if (!cancelled) {
          setReport(nextReport);
          setOverview(nextOverview);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(getErrorMessage(error, 'Không tải được báo cáo.'), {
            variant: 'error',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar, reportId]);

  const receive = async () => {
    setProcessing(true);
    try {
      setReport(await adminOccupationalAccidentReportApi.receive(reportId));
      setReceiveOpen(false);
      enqueueSnackbar('Đã tiếp nhận báo cáo.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Không thể tiếp nhận báo cáo.'), {
        variant: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  const returnForSupplement = async () => {
    const reason = returnReason.trim();
    if (reason.length < 10) return;
    setProcessing(true);
    try {
      setReport(
        await adminOccupationalAccidentReportApi.returnForSupplement(
          reportId,
          reason,
        ),
      );
      setReturnOpen(false);
      setReturnReason('');
      enqueueSnackbar('Đã trả báo cáo cho doanh nghiệp bổ sung.', {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Không thể trả lại báo cáo.'), {
        variant: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LinearProgress />;
  if (!report || !overview)
    return <Alert severity="error">Không tìm thấy báo cáo.</Alert>;

  const reviewStatus =
    report.status as ReviewableOccupationalAccidentReportStatus;
  const statusMeta = ADMIN_REPORT_STATUS[reviewStatus];
  const canReview = report.status === 'SUBMITTED';
  const coverage = getOccupationalAccidentCoverage(
    report.reportPeriod.reportYear,
    report.reportPeriod.periodCode,
  );

  return (
    <Stack spacing={1.5} className="print-document">
      <Card
        square
        elevation={1}
        className="no-print"
        sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <IconButton
          size="small"
          onClick={() => router.push('/admin/occupational-accident-reports')}
          aria-label="Quay lại"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            Báo cáo định kỳ tai nạn lao động
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {report.enterprise.enterpriseName} ·{' '}
            {report.reportPeriod.reportPeriod} {report.reportPeriod.reportYear}
          </Typography>
        </Box>
        {statusMeta && (
          <Chip
            size="small"
            variant="outlined"
            label={statusMeta.label}
            color={statusMeta.color}
          />
        )}
        <Button
          variant="outlined"
          startIcon={<PrintOutlinedIcon />}
          onClick={() => printOccupationalAccidentReport(report, overview)}
        >
          In báo cáo
        </Button>
        {canReview && (
          <>
            <Button
              color="warning"
              variant="outlined"
              startIcon={<AssignmentReturnOutlinedIcon />}
              onClick={() => setReturnOpen(true)}
            >
              Yêu cầu bổ sung
            </Button>
            <Button
              variant="contained"
              disabled={!report.signedDocument}
              startIcon={<CheckCircleOutlinedIcon />}
              onClick={() => setReceiveOpen(true)}
            >
              Tiếp nhận
            </Button>
          </>
        )}
      </Card>

      {report.status === 'RETURNED' && report.returnedReason && (
        <Alert severity="warning">
          Lý do yêu cầu bổ sung: {report.returnedReason}
        </Alert>
      )}

      <SignedDocumentPanel report={report} mode="admin" readOnly />

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Báo cáo tổng hợp tình hình tai nạn lao động
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Kỳ báo cáo: {report.reportPeriod.reportPeriod}{' '}
          {report.reportPeriod.reportYear} (
          {formatReportDate(coverage.startDate)} –{' '}
          {formatReportDate(coverage.endDate)})
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 1.5,
            mt: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tên doanh nghiệp
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {report.enterprise.enterpriseName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Mã số thuế
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {report.enterprise.taxCode}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Loại hình cơ sở
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {report.enterprise.businessTypeName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Ngày gửi
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {formatReportDateTime(report.submittedAt)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tổng số lao động
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {report.totalEmployees}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Số lao động nữ
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {report.femaleEmployees}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tổng quỹ lương
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {formatReportMoney(report.payrollFundVnd)} VND
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Khai báo không phát sinh
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {report.noAccidentsDeclared ? 'Có' : 'Không'}
            </Typography>
          </Box>
        </Box>
      </Card>

      <ReportTables overview={overview} />

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 1.5, fontWeight: 700 }}>Lịch sử xử lý</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái trước</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái sau</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nội dung</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(report.history ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {formatReportDateTime(item.performedAt)}
                  </TableCell>
                  <TableCell>{statusLabel(item.fromStatus)}</TableCell>
                  <TableCell>{statusLabel(item.toStatus)}</TableCell>
                  <TableCell>{item.reason ?? '—'}</TableCell>
                </TableRow>
              ))}
              {(report.history ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
                    sx={{ color: 'text.secondary' }}
                  >
                    Chưa có lịch sử xử lý.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={receiveOpen}
        onClose={processing ? undefined : () => setReceiveOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Tiếp nhận báo cáo</DialogTitle>
        <DialogContent>
          Báo cáo sẽ được ghi nhận là đã tiếp nhận và đưa vào số liệu tổng hợp.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveOpen(false)} disabled={processing}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={receive}
            disabled={processing}
            startIcon={
              processing ? (
                <CircularProgress size={16} />
              ) : (
                <CheckCircleOutlinedIcon />
              )
            }
          >
            Tiếp nhận
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={returnOpen}
        onClose={processing ? undefined : () => setReturnOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Yêu cầu doanh nghiệp bổ sung</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            label="Lý do yêu cầu bổ sung"
            value={returnReason}
            onChange={(event) => setReturnReason(event.target.value)}
            error={returnReason.length > 0 && returnReason.trim().length < 10}
            helperText="Nhập ít nhất 10 ký tự để doanh nghiệp biết nội dung cần bổ sung."
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnOpen(false)} disabled={processing}>
            Hủy
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={returnForSupplement}
            disabled={processing || returnReason.trim().length < 10}
            startIcon={
              processing ? (
                <CircularProgress size={16} />
              ) : (
                <AssignmentReturnOutlinedIcon />
              )
            }
          >
            Trả lại báo cáo
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
