"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import { useSnackbar } from "notistack";
import {
  adminOccupationalAccidentReportApi,
  type OccupationalAccidentCase,
  type OccupationalAccidentOverview,
  type OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { getErrorMessage } from "@/services/user";
import Article39Form from "./Article39Form";
import OverviewPanel from "./OverviewPanel";
import ReportHeaderForm from "./ReportHeaderForm";
import SignedDocumentPanel from "./SignedDocumentPanel";
import { printOccupationalAccidentReport } from "./reportPrint";

const STATUS = {
  DRAFT: { label: "Bản nháp", color: "default" as const },
  SUBMITTED: { label: "Chờ tiếp nhận", color: "primary" as const },
  RECEIVED: { label: "Đã tiếp nhận", color: "success" as const },
  RETURNED: { label: "Đã trả bổ sung", color: "warning" as const },
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const formatMoney = (value: string) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || "0"));

function AccidentCasesReadOnly({ cases }: { cases: OccupationalAccidentCase[] }) {
  if (cases.length === 0) {
    return <Alert severity="info">Báo cáo không có vụ tai nạn thuộc phạm vi doanh nghiệp quản lý.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {cases.map((item, index) => {
        const victims = item.victimGroups.reduce((sum, row) => sum + row.victimCount, 0);
        return (
          <Card key={item.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1.5 }}>
              <Typography sx={{ flex: 1, fontWeight: 700 }}>
                Vụ tai nạn số {index + 1} · {formatDate(item.accidentDate)}
              </Typography>
              <Chip size="small" label={`${victims} nạn nhân`} variant="outlined" />
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 1,
                mb: 2,
              }}
            >
              <Typography variant="body2">
                <strong>Nguyên nhân:</strong> {item.accidentCause.code} - {item.accidentCause.name}
              </Typography>
              <Typography variant="body2">
                <strong>Yếu tố chấn thương:</strong> {item.injuryFactor.code} - {item.injuryFactor.name}
              </Typography>
            </Box>
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nghề nghiệp</TableCell>
                    <TableCell>Phạm vi quản lý</TableCell>
                    <TableCell align="right">Nạn nhân</TableCell>
                    <TableCell align="right">Nữ</TableCell>
                    <TableCell align="right">Chết</TableCell>
                    <TableCell align="right">Thương nặng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {item.victimGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>{group.occupation.code} - {group.occupation.name}</TableCell>
                      <TableCell>{group.isUnderEnterpriseManagement ? "Doanh nghiệp" : "Ngoài doanh nghiệp"}</TableCell>
                      <TableCell align="right">{group.victimCount}</TableCell>
                      <TableCell align="right">{group.femaleCount}</TableCell>
                      <TableCell align="right">{group.deathCount}</TableCell>
                      <TableCell align="right">{group.severeCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Typography variant="body2">Chi phí y tế: {formatMoney(item.medicalCostVnd)} VND</Typography>
              <Typography variant="body2">Lương điều trị: {formatMoney(item.salaryCostVnd)} VND</Typography>
              <Typography variant="body2">Bồi thường: {formatMoney(item.compensationCostVnd)} VND</Typography>
              <Typography variant="body2">Nghỉ: {item.lostWorkDays} ngày</Typography>
              <Typography variant="body2">Thiệt hại tài sản: {formatMoney(item.propertyDamageVnd)} VND</Typography>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

function HistoryTable({ report }: { report: OccupationalAccidentReport }) {
  const history = report.history ?? [];
  return (
    <Card variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Trạng thái trước</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Trạng thái sau</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Người thực hiện</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Lý do</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDateTime(row.performedAt)}</TableCell>
                <TableCell>{row.fromStatus ? STATUS[row.fromStatus].label : "Khởi tạo"}</TableCell>
                <TableCell>{STATUS[row.toStatus].label}</TableCell>
                <TableCell>{row.performedBy ?? "—"}</TableCell>
                <TableCell>{row.reason || "—"}</TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Chưa có lịch sử xử lý.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

export default function AdminReportReview({ reportId }: { reportId: number }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [report, setReport] = useState<OccupationalAccidentReport | null>(null);
  const [overview, setOverview] = useState<OccupationalAccidentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState(0);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminOccupationalAccidentReportApi.get(reportId),
      adminOccupationalAccidentReportApi.overview(reportId),
    ])
      .then(([nextReport, nextOverview]) => {
        if (cancelled) return;
        setReport(nextReport);
        setOverview(nextOverview);
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(getErrorMessage(error, "Không tải được báo cáo."), { variant: "error" });
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
    if (!window.confirm("Xác nhận tiếp nhận báo cáo này? Báo cáo sẽ kết thúc xử lý.")) return;
    setProcessing(true);
    try {
      setReport(await adminOccupationalAccidentReportApi.receive(reportId));
      enqueueSnackbar("Đã tiếp nhận báo cáo.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Không thể tiếp nhận báo cáo."), { variant: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const returnForSupplement = async () => {
    const reason = returnReason.trim();
    if (reason.length < 10) return;
    setProcessing(true);
    try {
      setReport(await adminOccupationalAccidentReportApi.returnForSupplement(reportId, reason));
      setReturnOpen(false);
      setReturnReason("");
      enqueueSnackbar("Đã trả báo cáo cho doanh nghiệp bổ sung.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Không thể trả lại báo cáo."), { variant: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LinearProgress />;
  if (!report || !overview) return <Alert severity="error">Không tìm thấy báo cáo đã gửi.</Alert>;

  return (
    <Stack spacing={1.5}>
      <Card square elevation={1} sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton size="small" onClick={() => router.push("/accidents/labor-contracts")} aria-label="Quay lại">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{report.enterprise.enterpriseName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {report.reportPeriod.reportName} · {report.reportPeriod.reportPeriod} năm {report.reportPeriod.reportYear}
          </Typography>
        </Box>
        <Chip size="small" variant="outlined" label={STATUS[report.status].label} color={STATUS[report.status].color} />
        <Button
          variant="outlined"
          startIcon={<PrintOutlinedIcon />}
          onClick={() => printOccupationalAccidentReport(report, overview)}
        >
          In báo cáo
        </Button>
        {report.status === "SUBMITTED" && (
          <>
            <Button
              color="warning"
              variant="outlined"
              startIcon={<ReplayOutlinedIcon />}
              disabled={processing}
              onClick={() => setReturnOpen(true)}
            >
              Trả bổ sung
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={processing ? <CircularProgress size={16} /> : <AssignmentTurnedInOutlinedIcon />}
              disabled={processing || !report.signedDocument}
              onClick={receive}
            >
              Tiếp nhận
            </Button>
          </>
        )}
      </Card>

      {report.status === "RETURNED" && report.returnedReason && (
        <Alert severity="warning">Lý do trả bổ sung: {report.returnedReason}</Alert>
      )}
      <SignedDocumentPanel report={report} mode="admin" readOnly />
      <Card square>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Thông tin doanh nghiệp" />
          <Tab label={`Chi tiết tai nạn (${report.cases.length})`} />
          <Tab label="Khoản 2 Điều 39" />
          <Tab label="Số liệu tổng hợp" />
          <Tab label={`Lịch sử (${report.history?.length ?? 0})`} />
        </Tabs>
      </Card>

      {tab === 0 && <ReportHeaderForm report={report} readOnly saving={false} onSave={() => undefined} />}
      {tab === 1 && <AccidentCasesReadOnly cases={report.cases} />}
      {tab === 2 && <Article39Form report={report} readOnly saving={false} onSave={() => undefined} />}
      {tab === 3 && <OverviewPanel overview={overview} />}
      {tab === 4 && <HistoryTable report={report} />}

      <Dialog open={returnOpen} onClose={processing ? undefined : () => setReturnOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Trả báo cáo để bổ sung</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            required
            multiline
            minRows={4}
            fullWidth
            sx={{ mt: 1 }}
            label="Lý do trả lại"
            value={returnReason}
            error={returnReason.length > 0 && returnReason.trim().length < 10}
            helperText={`${returnReason.trim().length}/1000 ký tự · tối thiểu 10 ký tự`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            onChange={(event) => setReturnReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={processing} onClick={() => setReturnOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={processing || returnReason.trim().length < 10}
            onClick={returnForSupplement}
          >
            Xác nhận trả lại
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
