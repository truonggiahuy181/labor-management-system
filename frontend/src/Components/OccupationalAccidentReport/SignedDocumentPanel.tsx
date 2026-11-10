"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useSnackbar } from "notistack";
import {
  adminOccupationalAccidentReportApi,
  occupationalAccidentReportApi,
  type OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { getErrorMessage } from "@/services/user";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

interface SignedDocumentPanelProps {
  report: OccupationalAccidentReport;
  mode: "enterprise" | "admin";
  readOnly?: boolean;
  compact?: boolean;
  onReportChange?: (report: OccupationalAccidentReport) => void;
}

export default function SignedDocumentPanel({
  report,
  mode,
  readOnly = false,
  compact = false,
  onReportChange,
}: SignedDocumentPanelProps) {
  const { enqueueSnackbar } = useSnackbar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const document = report.signedDocument;
  const draftDocument = document?.isDraft === true;
  const editable = mode === "enterprise" && !readOnly;

  const viewDocument = async () => {
    const popup = window.open("about:blank", "_blank");
    setProcessing(true);
    try {
      const access =
        mode === "admin"
          ? await adminOccupationalAccidentReportApi.signedDocumentAccess(
              report.id,
            )
          : await occupationalAccidentReportApi.signedDocumentAccess(report.id);
      if (popup) {
        popup.opener = null;
        popup.location.href = access.accessUrl;
      } else {
        window.location.assign(access.accessUrl);
      }
    } catch (error) {
      popup?.close();
      enqueueSnackbar(
        getErrorMessage(error, "Không thể mở bản báo cáo đã ký."),
        {
          variant: "error",
        },
      );
    } finally {
      setProcessing(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      enqueueSnackbar("Chỉ chấp nhận tệp PDF.", { variant: "warning" });
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      enqueueSnackbar("Tệp PDF không được vượt quá 10 MB.", {
        variant: "warning",
      });
      return;
    }
    setProcessing(true);
    try {
      const nextReport =
        await occupationalAccidentReportApi.uploadSignedDocument(
          report.id,
          file,
        );
      onReportChange?.(nextReport);
      enqueueSnackbar("Đã tải lên bản báo cáo ký, đóng dấu.", {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Không thể tải tệp PDF."), {
        variant: "error",
      });
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!window.confirm("Gỡ bản báo cáo PDF đã tải lên?")) return;
    setProcessing(true);
    try {
      const nextReport =
        await occupationalAccidentReportApi.removeSignedDocument(report.id);
      onReportChange?.(nextReport);
      enqueueSnackbar("Đã gỡ bản báo cáo PDF.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Không thể gỡ tệp PDF."), {
        variant: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={
        compact
          ? { p: 0, border: 0, boxShadow: "none", bgcolor: "transparent" }
          : { p: 2 }
      }
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ alignItems: { md: "center" } }}
      >
        <Stack
          direction={compact ? { xs: "column", sm: "row" } : "column"}
          spacing={compact ? 1 : 0}
          sx={{
            flex: 1,
            minWidth: 0,
            alignItems: compact ? { sm: "center" } : undefined,
          }}
        >
          <Typography
            sx={{
              fontWeight: compact ? 400 : 700,
              fontSize: compact ? 12 : undefined,
            }}
          >
            {compact
              ? "Báo cáo TNLĐ đã ký, đóng dấu:"
              : "Bản báo cáo đã ký, đóng dấu"}
          </Typography>
          {document && compact ? (
            <Button
              size="small"
              onClick={viewDocument}
              disabled={processing}
              sx={{
                px: 0,
                minWidth: 0,
                textTransform: "none",
                overflowWrap: "anywhere",
                textAlign: "left",
                justifyContent: "flex-start",
              }}
            >
              {document.originalName}
            </Button>
          ) : document ? (
            <Typography variant="body2" color="text.secondary">
              {document.originalName} ·{" "}
              {(Number(document.size) / 1024 / 1024).toFixed(2)} MB ·{" "}
              {draftDocument
                ? "bản nháp tải lên"
                : `lần nộp #${document.submissionNo}`}{" "}
              {new Date(document.uploadedAt).toLocaleString("vi-VN")}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              In báo cáo, ký và đóng dấu, sau đó tải lại dưới dạng PDF tối đa 10
              MB.
            </Typography>
          )}
        </Stack>

        {processing && <CircularProgress size={22} />}
        {document && !compact && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityOutlinedIcon />}
            disabled={processing}
            onClick={viewDocument}
          >
            Xem PDF
          </Button>
        )}
        {editable && (
          <>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => upload(event.target.files?.[0])}
            />
            <Button
              size="small"
              variant={draftDocument ? "outlined" : "contained"}
              startIcon={<UploadFileOutlinedIcon />}
              disabled={processing}
              onClick={() => inputRef.current?.click()}
            >
              {draftDocument ? "Thay PDF" : "Tải PDF mới đã ký"}
            </Button>
            {draftDocument && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={processing}
                onClick={remove}
              >
                Gỡ tệp
              </Button>
            )}
          </>
        )}
      </Stack>
      {!document && mode === "enterprise" && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Đây là hồ sơ bắt buộc. Báo cáo chưa thể gửi cho đến khi có bản PDF đã
          ký, đóng dấu.
        </Alert>
      )}
      {document && !draftDocument && editable && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          PDF của lần nộp trước đã được khóa. Hãy tải PDF mới đã ký để gửi lại
          báo cáo.
        </Alert>
      )}
      {!document && mode === "admin" && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Báo cáo này không có bản PDF ký, đóng dấu đính kèm.
        </Alert>
      )}
      {report.submissions.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
            Lịch sử các lần nộp
          </Typography>
          <Stack spacing={0.5}>
            {report.submissions.map((submission) => (
              <Typography
                key={submission.id}
                variant="body2"
                color="text.secondary"
              >
                Lần #{submission.submissionNo} · ngày báo cáo{" "}
                {new Date(
                  `${submission.reportDate}T00:00:00`,
                ).toLocaleDateString("vi-VN")}{" "}
                · gửi {new Date(submission.submittedAt).toLocaleString("vi-VN")}{" "}
                · {submission.documentOriginalName} · SHA-256{" "}
                {submission.documentSha256.slice(0, 12)}…
              </Typography>
            ))}
          </Stack>
        </>
      )}
    </Card>
  );
}
