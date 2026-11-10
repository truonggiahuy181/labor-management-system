"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
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
import { getReportPeriodLabel } from "@/services/reportPeriod";
import { getErrorMessage } from "@/services/user";
import AccidentCaseDialog from "./AccidentCaseDialog";
import AccidentCasePanel from "./AccidentCasePanel";
import Article39Form from "./Article39Form";
import OverviewPanel from "./OverviewPanel";
import RegularAccidentSummary from "./RegularAccidentSummary";
import ReportHeaderForm from "./ReportHeaderForm";
import SignedDocumentPanel from "./SignedDocumentPanel";
import { printOccupationalAccidentReport } from "./reportPrint";

const STATUS = {
  DRAFT: { label: "Đang khai báo", color: "info" as const },
  SUBMITTED: { label: "Đã gửi", color: "primary" as const },
  RECEIVED: { label: "Đã tiếp nhận", color: "success" as const },
  RETURNED: { label: "Yêu cầu bổ sung", color: "warning" as const },
};

const REPORT_SECTIONS = [
  "Thông tin doanh nghiệp",
  "1. Tai nạn lao động",
  "2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ",
  "Xem tổng quan báo cáo tai nạn lao động",
] as const;

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
  const [section, setSection] = useState(0);
  const [regularTab, setRegularTab] = useState(0);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
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
    )
      return;
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
  if (!report || !overview)
    return <Alert severity="error">Không tìm thấy báo cáo.</Alert>;

  const readOnly =
    report.status === "SUBMITTED" ||
    report.status === "RECEIVED" ||
    !report.reportPeriod.isSubmissionOpen;
  const coverage = getOccupationalAccidentCoverage(
    report.reportPeriod.reportYear,
    report.reportPeriod.periodCode,
  );

  const moveNext = () => {
    if (section === 1 && regularTab === 0) {
      setRegularTab(1);
      return;
    }
    if (section < REPORT_SECTIONS.length - 1) {
      setSection((current) => current + 1);
      setRegularTab(0);
    }
  };

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
          gap: 1.25,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography sx={{ fontWeight: 700 }}>
            Báo cáo định kỳ Tai nạn lao động
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getReportPeriodLabel(report.reportPeriod.periodCode)} ·{" "}
            {report.reportPeriod.reportName}
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          label={STATUS[report.status].label}
          color={STATUS[report.status].color}
        />
        <TextField
          size="small"
          value={report.reportPeriod.reportYear}
          aria-label="Năm báo cáo"
          slotProps={{ input: { readOnly: true } }}
          sx={{ width: 92 }}
        />
        <Button color="inherit" onClick={() => setCancelDialogOpen(true)}>
          Hủy bỏ
        </Button>
        {section < REPORT_SECTIONS.length - 1 && (
          <Button
            variant="outlined"
            endIcon={<NavigateNextIcon />}
            onClick={moveNext}
          >
            Tiếp tục
          </Button>
        )}
        {section === REPORT_SECTIONS.length - 1 && (
          <Button
            variant="outlined"
            startIcon={<PrintOutlinedIcon />}
            onClick={() => printOccupationalAccidentReport(report, overview)}
          >
            In báo cáo
          </Button>
        )}
        {!readOnly && section === REPORT_SECTIONS.length - 1 && (
          <Button
            variant="contained"
            startIcon={
              submitting ? <CircularProgress size={16} /> : <SendOutlinedIcon />
            }
            disabled={submitting || saving || !report.signedDocument?.isDraft}
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

      <Card square variant="outlined" sx={{ p: 1.5 }}>
        <Autocomplete
          size="small"
          options={[...REPORT_SECTIONS]}
          value={REPORT_SECTIONS[section]}
          autoHighlight
          openOnFocus
          selectOnFocus
          onChange={(_, option) => {
            if (!option) return;
            setSection(REPORT_SECTIONS.indexOf(option));
            setRegularTab(0);
          }}
          sx={{ maxWidth: 620 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Chọn mục báo cáo"
              placeholder="Nhập tên mục để tìm"
            />
          )}
        />
        {section === 1 && (
          <Tabs
            value={regularTab}
            onChange={(_, value) => setRegularTab(value)}
            sx={{ mt: 1, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="(1) Tổng số vụ tai nạn lao động" />
            <Tab label="(2) Chi tiết các vụ tai nạn lao động" />
          </Tabs>
        )}
      </Card>

      {section === 0 && (
        <ReportHeaderForm
          key={`header-${report.version}`}
          report={report}
          readOnly={readOnly}
          saving={saving}
          onSave={saveHeader}
        />
      )}

      {section === 1 && regularTab === 0 && (
        <RegularAccidentSummary summary={overview.regular} />
      )}

      {section === 1 && regularTab === 1 && (
        <AccidentCasePanel
          cases={report.cases}
          noAccidentsDeclared={report.noAccidentsDeclared}
          readOnly={readOnly}
          onAdd={() => {
            setEditingCase(null);
            setCaseDialogOpen(true);
          }}
          onEdit={(item) => {
            setEditingCase(item);
            setCaseDialogOpen(true);
          }}
          onRemove={removeCase}
        />
      )}

      {section === 2 && (
        <Article39Form
          key={`article39-${report.version}`}
          report={report}
          readOnly={readOnly}
          saving={saving}
          onSave={saveArticle39}
        />
      )}

      {section === 3 && (
        <Stack spacing={1.5}>
          <OverviewPanel overview={overview} />
          <SignedDocumentPanel
            report={report}
            mode="enterprise"
            readOnly={readOnly}
            onReportChange={setReport}
          />
        </Stack>
      )}

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

      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            textAlign: "center",
          }}
        >
          Cảnh báo
        </DialogTitle>
        <DialogContent sx={{ pt: "24px !important", textAlign: "center" }}>
          Dữ liệu chưa lưu trong biểu mẫu hiện tại sẽ không được giữ lại.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Hủy bỏ</Button>
          <Button
            variant="contained"
            onClick={() => router.push("/accidents/labor-contracts")}
          >
            {" "}
            Đồng ý{" "}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
