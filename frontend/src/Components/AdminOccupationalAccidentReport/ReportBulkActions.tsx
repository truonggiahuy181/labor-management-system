"use client";

import { Fragment, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSnackbar } from "notistack";
import type { AdminOccupationalAccidentReportListItem } from "@/services/occupationalAccidentReport";
import { getReportPeriodLabel } from "@/services/reportPeriod";
import { getErrorMessage } from "@/services/user";
import {
  reviewReportBatch,
  type BulkReviewAction,
  type BulkReviewFailure,
} from "./bulkReview";
import ReviewFlagChips from "./ReviewFlagChips";
import {
  combineReviewReason,
  getReviewReasonDraft,
  isValidReviewReason,
  REPORT_REVIEW_FLAGS,
  type ReportReviewFlagFilter,
  type ReportReviewLabel,
} from "@/constants/reportReviewFlags";

export default function ReportBulkActions({
  reports,
  disabled,
  onClear,
  onProcessed,
  reviewFlag,
  reviewLabels = REPORT_REVIEW_FLAGS,
}: {
  reports: AdminOccupationalAccidentReportListItem[];
  disabled: boolean;
  onClear: () => void;
  onProcessed: (successfulIds: number[]) => void;
  reviewFlag?: ReportReviewFlagFilter | "";
  reviewLabels?: readonly ReportReviewLabel[];
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [action, setAction] = useState<BulkReviewAction | null>(null);
  const [targets, setTargets] = useState<
    AdminOccupationalAccidentReportListItem[]
  >([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [reason, setReason] = useState("");
  const [additionalReasons, setAdditionalReasons] = useState<
    Record<number, string>
  >({});
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [failures, setFailures] = useState<BulkReviewFailure[]>([]);
  const processingRef = useRef(false);
  const eligible = reports.filter((report) => report.status === "SUBMITTED");
  const returning = action === "return";
  const normalizedReason = reason.trim();
  const validCommonReason = isValidReviewReason(normalizedReason);
  const validReason =
    validCommonReason &&
    targets.every((report) =>
      isValidReviewReason(
        combineReviewReason(reason, additionalReasons[report.id]),
      ),
    );

  const openDialog = (nextAction: BulkReviewAction) => {
    setTargets(eligible);
    setSkippedCount(reports.length - eligible.length);
    setAction(nextAction);
    const draft = getReviewReasonDraft(eligible, reviewFlag, reviewLabels);
    setReason(nextAction === "return" ? draft.reason : "");
    setAdditionalReasons(
      nextAction === "return" ? draft.additionalReasons : {},
    );
    setFailures([]);
    setCompleted(0);
  };

  const removeTarget = (id: number) => {
    setTargets((current) => current.filter((report) => report.id !== id));
    setFailures((current) =>
      current.filter((failure) => failure.report.id !== id),
    );
  };

  const submit = async () => {
    if (
      !action ||
      disabled ||
      processingRef.current ||
      targets.length === 0 ||
      (returning && !validReason)
    )
      return;

    processingRef.current = true;
    setProcessing(true);
    setCompleted(0);
    try {
      const result = await reviewReportBatch(
        targets,
        action,
        reason,
        setCompleted,
        additionalReasons,
      );
      if (result.successfulIds.length > 0) {
        enqueueSnackbar(
          returning
            ? `Đã yêu cầu bổ sung ${result.successfulIds.length} báo cáo.`
            : `Đã tiếp nhận ${result.successfulIds.length} báo cáo.`,
          { variant: "success" },
        );
      }
      if (result.failures.length > 0) {
        setTargets(result.failures.map((failure) => failure.report));
        setFailures(result.failures);
        setSkippedCount(0);
        enqueueSnackbar(
          `${result.failures.length} báo cáo chưa xử lý được. Xem chi tiết trong hộp thoại.`,
          { variant: "warning" },
        );
      } else {
        setAction(null);
      }
      onProcessed(result.successfulIds);
    } catch (error) {
      enqueueSnackbar(
        getErrorMessage(error, "Không xử lý được các báo cáo đã chọn."),
        {
          variant: "error",
        },
      );
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  return (
    <>
      {reports.length > 0 && (
        <Stack
          role="region"
          aria-label="Thao tác với báo cáo đã chọn"
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{
            mx: 1.5,
            mb: 1.5,
            p: 1.5,
            border: 1,
            borderRadius: 1,
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
            alignItems: { md: "center" },
          }}
        >
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ alignItems: "center", flex: 1 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 1,
                bgcolor: "primary.main",
                color: "common.white",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {reports.length}
            </Box>
            <Box aria-live="polite">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Báo cáo đã chọn
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {eligible.length > 0
                  ? `${eligible.length} báo cáo Đã gửi có thể xử lý`
                  : "Chỉ có thể xử lý báo cáo ở trạng thái Đã gửi"}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckCircleOutlinedIcon />}
              disabled={disabled || processing || eligible.length === 0}
              onClick={() => openDialog("receive")}
            >
              Tiếp nhận ({eligible.length})
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<AssignmentReturnOutlinedIcon />}
              disabled={disabled || processing || eligible.length === 0}
              onClick={() => openDialog("return")}
            >
              Yêu cầu bổ sung ({eligible.length})
            </Button>
            <Tooltip title="Bỏ chọn tất cả">
              <span>
                <IconButton
                  size="small"
                  aria-label="Bỏ chọn tất cả"
                  onClick={onClear}
                  disabled={disabled || processing}
                >
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      )}

      <Dialog
        open={action !== null}
        onClose={processing ? undefined : () => setAction(null)}
        fullWidth
        maxWidth={returning ? "md" : "sm"}
        aria-labelledby="bulk-review-title"
      >
        <DialogTitle id="bulk-review-title">
          {returning ? "Yêu cầu bổ sung báo cáo" : "Tiếp nhận báo cáo"}
          <Chip
            label={`${targets.length} báo cáo`}
            size="small"
            sx={{ ml: 1.5 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {returning
                ? "Nhập một lý do chung cho các báo cáo có cùng nội dung cần bổ sung. Có thể bỏ báo cáo khỏi danh sách bên dưới trước khi gửi."
                : "Các báo cáo được tiếp nhận sẽ được đưa vào số liệu tổng hợp. Kiểm tra danh sách trước khi xác nhận."}
            </Typography>
            {skippedCount > 0 && (
              <Alert severity="info">
                Bỏ qua {skippedCount} báo cáo đã tiếp nhận hoặc đang yêu cầu bổ
                sung. Chỉ xử lý báo cáo Đã gửi.
              </Alert>
            )}
            {failures.length > 0 && !processing && (
              <Alert severity="warning">
                Còn {failures.length} báo cáo chưa xử lý được; lý do được ghi
                dưới từng doanh nghiệp. Chỉ các báo cáo còn lại được thử lại.
                <Button
                  size="small"
                  color="inherit"
                  disabled={processing}
                  onClick={() => {
                    setAction(null);
                    onProcessed([]);
                  }}
                >
                  Tải lại để rà soát
                </Button>
              </Alert>
            )}
            {returning && (
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={4}
                label="Lý do yêu cầu bổ sung chung"
                placeholder="Nêu rõ nội dung doanh nghiệp cần chỉnh sửa hoặc bổ sung."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={processing}
                error={reason.length > 0 && !validCommonReason}
                helperText={`Áp dụng cho ${targets.length} báo cáo. Nhập từ 10 đến 1.000 ký tự; tổng lý do chung và riêng của mỗi báo cáo tối đa 1.000 ký tự.`}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
            )}
            {!returning &&
              targets.some((report) => report.reviewFlags.length > 0) && (
                <Alert severity="warning">
                  Có báo cáo đang được đánh dấu cần bổ sung. Kiểm tra các cờ
                  trước khi tiếp nhận.
                </Alert>
              )}
            {returning &&
              targets.some(
                (report) =>
                  combineReviewReason(reason, additionalReasons[report.id])
                    .length > 1000,
              ) && (
                <Alert severity="error">
                  Tổng lý do chung và riêng của một số báo cáo vượt 1.000 ký tự.
                  Rút gọn nội dung trước khi gửi.
                </Alert>
              )}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Danh sách xử lý ({targets.length})
              </Typography>
              <TableContainer
                sx={{
                  maxHeight: returning ? 520 : 260,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Table
                  size="small"
                  stickyHeader
                  aria-label="Danh sách báo cáo sẽ xử lý"
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Doanh nghiệp / Mã số thuế</TableCell>
                      <TableCell>Kỳ báo cáo</TableCell>
                      <TableCell align="center">Bỏ chọn</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {targets.map((report) => {
                      const failure = failures.find(
                        (item) => item.report.id === report.id,
                      );
                      return (
                        <Fragment key={report.id}>
                          <TableRow>
                            <TableCell>
                              <Typography variant="body2">
                                {report.enterpriseName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {report.taxCode}
                              </Typography>
                              {report.reviewFlags.length > 0 && (
                                <Box sx={{ mt: 0.75 }}>
                                  <ReviewFlagChips
                                    flags={report.reviewFlags}
                                    labels={reviewLabels}
                                  />
                                </Box>
                              )}
                              {failure && (
                                <Typography
                                  variant="caption"
                                  color="error"
                                  sx={{ display: "block", mt: 0.5 }}
                                >
                                  {failure.message}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ minWidth: 100 }}>
                              {getReportPeriodLabel(report.periodCode)}{" "}
                              {report.reportYear}
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Bỏ khỏi lần xử lý này">
                                <span>
                                  <IconButton
                                    size="small"
                                    aria-label={`Bỏ báo cáo ${report.enterpriseName} khỏi lần xử lý`}
                                    disabled={processing}
                                    onClick={() => removeTarget(report.id)}
                                  >
                                    <CloseOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                          {returning && (
                            <TableRow>
                              <TableCell colSpan={3} sx={{ pt: 0 }}>
                                <Accordion
                                  disableGutters
                                  elevation={0}
                                  defaultExpanded={Boolean(
                                    additionalReasons[report.id],
                                  )}
                                >
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                  >
                                    <Typography variant="body2">
                                      Bổ sung riêng / Xem nội dung gửi
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <Stack spacing={1.25}>
                                      <TextField
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        label={`Bổ sung riêng cho ${report.enterpriseName}`}
                                        placeholder="Tùy chọn"
                                        value={
                                          additionalReasons[report.id] ?? ""
                                        }
                                        disabled={processing}
                                        onChange={(event) =>
                                          setAdditionalReasons((current) => ({
                                            ...current,
                                            [report.id]: event.target.value,
                                          }))
                                        }
                                        slotProps={{
                                          htmlInput: { maxLength: 1000 },
                                        }}
                                        error={
                                          combineReviewReason(
                                            reason,
                                            additionalReasons[report.id],
                                          ).length > 1000
                                        }
                                        helperText={`${combineReviewReason(reason, additionalReasons[report.id]).length}/1.000 ký tự cho tổng nội dung gửi`}
                                      />
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        Nội dung doanh nghiệp sẽ nhận
                                      </Typography>
                                      <Box
                                        sx={{
                                          p: 1.5,
                                          bgcolor: "action.hover",
                                          borderRadius: 1,
                                        }}
                                      >
                                        <Typography
                                          variant="body2"
                                          sx={{ whiteSpace: "pre-wrap" }}
                                        >
                                          {combineReviewReason(
                                            reason,
                                            additionalReasons[report.id],
                                          ) || "Chưa có lý do."}
                                        </Typography>
                                      </Box>
                                    </Stack>
                                  </AccordionDetails>
                                </Accordion>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                    {targets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          Chưa có báo cáo nào để xử lý.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            {processing && (
              <Box role="status" aria-live="polite">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Đang xử lý {completed}/{targets.length} báo cáo…
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    targets.length > 0 ? (completed * 100) / targets.length : 0
                  }
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button disabled={processing} onClick={() => setAction(null)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color={returning ? "warning" : "primary"}
            disabled={
              disabled ||
              processing ||
              targets.length === 0 ||
              (returning && !validReason)
            }
            startIcon={
              processing ? (
                <CircularProgress size={16} color="inherit" />
              ) : returning ? (
                <AssignmentReturnOutlinedIcon />
              ) : (
                <CheckCircleOutlinedIcon />
              )
            }
            onClick={submit}
          >
            {failures.length > 0
              ? "Thử lại"
              : returning
                ? "Gửi yêu cầu bổ sung"
                : "Xác nhận tiếp nhận"}{" "}
            ({targets.length})
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
