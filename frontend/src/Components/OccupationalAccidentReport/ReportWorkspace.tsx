"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import { useSnackbar } from "notistack";
import {
  injuryFactorApi,
  occupationApi,
  type InjuryFactor,
  type Occupation,
} from "@/services/accidentCatalog";
import {
  accidentCauseApi,
  getOccupationalAccidentCoverage,
  occupationalAccidentReportApi,
  type AccidentCaseBody,
  type AccidentCause,
  type Article39SummaryBody,
  type OccupationalAccidentCase,
  type OccupationalAccidentOverview,
  type OccupationalAccidentReport,
  type UpdateReportHeaderBody,
} from "@/services/occupationalAccidentReport";
import { getErrorMessage } from "@/services/user";
import AccidentCaseDialog from "./AccidentCaseDialog";
import Article39Form from "./Article39Form";
import OverviewPanel from "./OverviewPanel";
import ReportHeaderForm from "./ReportHeaderForm";
import SignedDocumentPanel from "./SignedDocumentPanel";
import { printOccupationalAccidentReport } from "./reportPrint";

const STATUS = {
  DRAFT: { label: "Đang khai báo", color: "info" as const },
  SUBMITTED: { label: "Đã gửi", color: "primary" as const },
  RECEIVED: { label: "Đã tiếp nhận", color: "success" as const },
  RETURNED: { label: "Yêu cầu bổ sung", color: "warning" as const },
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatMoney = (value: string) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || "0"));

export default function ReportWorkspace({ reportId }: { reportId: number }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [report, setReport] = useState<OccupationalAccidentReport | null>(null);
  const [overview, setOverview] = useState<OccupationalAccidentOverview | null>(
    null,
  );
  const [causes, setCauses] = useState<AccidentCause[]>([]);
  const [injuryFactors, setInjuryFactors] = useState<InjuryFactor[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState(0);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] =
    useState<OccupationalAccidentCase | null>(null);

  const refresh = useCallback(async () => {
    const [nextReport, nextOverview] = await Promise.all([
      occupationalAccidentReportApi.getMine(reportId),
      occupationalAccidentReportApi.overview(reportId),
    ]);
    setReport(nextReport);
    setOverview(nextOverview);
  }, [reportId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      occupationalAccidentReportApi.getMine(reportId),
      occupationalAccidentReportApi.overview(reportId),
      accidentCauseApi.list(),
      injuryFactorApi.list({ isActive: true }),
      occupationApi.selectable(),
    ])
      .then(
        ([
          nextReport,
          nextOverview,
          nextCauses,
          nextFactors,
          nextOccupations,
        ]) => {
          if (cancelled) return;
          setReport(nextReport);
          setOverview(nextOverview);
          setCauses(nextCauses);
          setInjuryFactors(nextFactors);
          setOccupations(nextOccupations);
        },
      )
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(getErrorMessage(error, "Không tải được báo cáo."), {
            variant: "error",
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

  const runAndRefresh = async (
    task: () => Promise<unknown>,
    message: string,
  ) => {
    setSaving(true);
    try {
      await task();
      await refresh();
      enqueueSnackbar(message, { variant: "success" });
      return true;
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Không thể lưu dữ liệu."), {
        variant: "error",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveHeader = (body: UpdateReportHeaderBody) =>
    runAndRefresh(
      () => occupationalAccidentReportApi.updateHeader(reportId, body),
      "Đã lưu thông tin doanh nghiệp.",
    );

  const saveArticle39 = (body: Article39SummaryBody) =>
    runAndRefresh(
      () => occupationalAccidentReportApi.updateArticle39(reportId, body),
      "Đã lưu số liệu Khoản 2 Điều 39.",
    );

  const saveCase = async (body: AccidentCaseBody) => {
    const success = await runAndRefresh(
      () =>
        editingCase
          ? occupationalAccidentReportApi.updateCase(
              reportId,
              editingCase.id,
              body,
            )
          : occupationalAccidentReportApi.createCase(reportId, body),
      editingCase ? "Đã cập nhật vụ tai nạn." : "Đã thêm vụ tai nạn.",
    );
    if (success) {
      setCaseDialogOpen(false);
      setEditingCase(null);
    }
  };

  const removeCase = async (item: OccupationalAccidentCase) => {
    if (!window.confirm("Xóa vụ tai nạn này khỏi bản nháp?")) return;
    await runAndRefresh(
      () => occupationalAccidentReportApi.removeCase(reportId, item.id),
      "Đã xóa vụ tai nạn.",
    );
  };

  const submit = async () => {
    if (
      !window.confirm(
        "Gửi báo cáo? Sau khi gửi, doanh nghiệp không thể chỉnh sửa.",
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const nextReport = await occupationalAccidentReportApi.submit(reportId);
      setReport(nextReport);
      setOverview(await occupationalAccidentReportApi.overview(reportId));
      enqueueSnackbar("Đã gửi báo cáo.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Không thể gửi báo cáo."), {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LinearProgress />;
  if (!report || !overview) {
    return <Alert severity="error">Không tìm thấy báo cáo.</Alert>;
  }

  const readOnly =
    report.status === "SUBMITTED" ||
    report.status === "RECEIVED" ||
    !report.reportPeriod.isSubmissionOpen;
  const coverage = getOccupationalAccidentCoverage(
    report.reportPeriod.reportYear,
    report.reportPeriod.periodCode,
  );

  return (
    <Stack spacing={1.5}>
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
        <IconButton
          size="small"
          onClick={() => router.push("/accidents/labor-contracts")}
          aria-label="Quay lại"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {report.reportPeriod.reportName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {report.reportPeriod.reportPeriod} năm{" "}
            {report.reportPeriod.reportYear} · Thời gian nhận:{" "}
            {formatDate(report.reportPeriod.startDate)} –{" "}
            {formatDate(report.reportPeriod.endDate)}
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          label={STATUS[report.status].label}
          color={STATUS[report.status].color}
        />
        <Button
          variant="outlined"
          startIcon={<PrintOutlinedIcon />}
          onClick={() => printOccupationalAccidentReport(report, overview)}
        >
          In báo cáo
        </Button>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={
              submitting ? <CircularProgress size={16} /> : <SendOutlinedIcon />
            }
            disabled={submitting || saving || !report.signedDocument}
            onClick={submit}
          >
            Gửi báo cáo
          </Button>
        )}
      </Card>

      {!report.reportPeriod.isSubmissionOpen &&
        report.status !== "SUBMITTED" &&
        report.status !== "RECEIVED" && (
          <Alert severity="warning">
            Kỳ báo cáo hiện đã đóng; dữ liệu chỉ được phép xem.
          </Alert>
        )}

      <SignedDocumentPanel
        report={report}
        mode="enterprise"
        readOnly={readOnly}
        onReportChange={setReport}
      />

      <Card square>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Thông tin doanh nghiệp" />
          <Tab label={`Tai nạn lao động (${report.cases.length})`} />
          <Tab label="Khoản 2 Điều 39" />
          <Tab label="Xem tổng quan" />
        </Tabs>
      </Card>

      <Box>
        {tab === 0 && (
          <ReportHeaderForm
            key={`header-${report.version}`}
            report={report}
            readOnly={readOnly}
            saving={saving}
            onSave={saveHeader}
          />
        )}

        {tab === 1 && (
          <Card variant="outlined">
            <Stack direction="row" sx={{ p: 2, alignItems: "center" }}>
              <Typography sx={{ flex: 1, fontWeight: 700 }}>
                Chi tiết các vụ tai nạn lao động
              </Typography>
              {!readOnly && !report.noAccidentsDeclared && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingCase(null);
                    setCaseDialogOpen(true);
                  }}
                >
                  Thêm vụ tai nạn
                </Button>
              )}
            </Stack>
            {report.noAccidentsDeclared && (
              <Alert severity="info" sx={{ mx: 2, mb: 2 }}>
                Doanh nghiệp đã xác nhận không phát sinh tai nạn trong kỳ.
              </Alert>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 100, fontWeight: 600 }}>
                      Thao tác
                    </TableCell>
                    <TableCell sx={{ width: 130, fontWeight: 600 }}>
                      Ngày tai nạn
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nguyên nhân</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Yếu tố chấn thương
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Nạn nhân
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Tử vong
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Tổng chi phí
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.cases.map((item) => {
                    const victims = item.victimGroups.reduce(
                      (sum, group) => sum + group.victimCount,
                      0,
                    );
                    const deaths = item.victimGroups.reduce(
                      (sum, group) => sum + group.deathCount,
                      0,
                    );
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          {!readOnly && (
                            <>
                              <Tooltip title="Chỉnh sửa">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingCase(item);
                                    setCaseDialogOpen(true);
                                  }}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeCase(item)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.accidentDate)}</TableCell>
                        <TableCell>{item.accidentCause.name}</TableCell>
                        <TableCell>{item.injuryFactor.name}</TableCell>
                        <TableCell align="right">{victims}</TableCell>
                        <TableCell align="right">{deaths}</TableCell>
                        <TableCell align="right">
                          {formatMoney(item.totalCostVnd)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {report.cases.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="center"
                        sx={{ py: 5, color: "text.secondary" }}
                      >
                        Chưa có vụ tai nạn nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {tab === 2 && (
          <Article39Form
            key={`article39-${report.version}`}
            report={report}
            readOnly={readOnly}
            saving={saving}
            onSave={saveArticle39}
          />
        )}

        {tab === 3 && <OverviewPanel overview={overview} />}
      </Box>

      {caseDialogOpen && (
        <AccidentCaseDialog
          open
          item={editingCase}
          causes={causes}
          injuryFactors={injuryFactors}
          occupations={occupations}
          minDate={coverage.startDate}
          maxDate={coverage.endDate}
          saving={saving}
          onClose={() => {
            setCaseDialogOpen(false);
            setEditingCase(null);
          }}
          onSave={saveCase}
        />
      )}
    </Stack>
  );
}
