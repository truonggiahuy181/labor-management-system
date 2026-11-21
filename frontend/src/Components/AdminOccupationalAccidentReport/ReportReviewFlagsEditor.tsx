"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { useSnackbar } from "notistack";
import {
  MAX_REPORT_REVIEW_FLAGS,
  REPORT_REVIEW_FLAGS,
  type ReportReviewFlag,
  type ReportReviewLabel,
} from "@/constants/reportReviewFlags";
import {
  adminOccupationalAccidentReportApi,
  type AdminOccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { getErrorMessage } from "@/services/user";

const normalizeName = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/gu, " ");

export default function ReportReviewFlagsEditor({
  report,
  disabled,
  onSaved,
}: {
  report: AdminOccupationalAccidentReport;
  disabled: boolean;
  onSaved: (report: AdminOccupationalAccidentReport) => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [flags, setFlags] = useState<ReportReviewFlag[]>([]);
  const [labels, setLabels] = useState<readonly ReportReviewLabel[]>(
    report.reviewLabels ?? REPORT_REVIEW_FLAGS,
  );
  const [newLabel, setNewLabel] = useState("");
  const [labelError, setLabelError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const busy = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = (element: HTMLElement) => {
    setFlags(report.reviewFlags);
    setLabels((current) => [
      ...new Map(
        [...current, ...(report.reviewLabels ?? REPORT_REVIEW_FLAGS)].map(
          (label) => [label.value, label],
        ),
      ).values(),
    ]);
    setNewLabel("");
    setLabelError("");
    setError("");
    setAnchor(element);
    void adminOccupationalAccidentReportApi
      .reviewLabels()
      .then((next) => {
        setLabels((current) => [
          ...new Map(
            [...current, ...next].map((label) => [label.value, label]),
          ).values(),
        ]);
      })
      .catch(() => {});
  };
  const toggle = (value: string, checked: boolean) => {
    if (checked && flags.length >= MAX_REPORT_REVIEW_FLAGS) {
      setError(
        `Chọn tối đa ${MAX_REPORT_REVIEW_FLAGS} nội dung cho một báo cáo.`,
      );
      return;
    }
    setError("");
    setFlags((current) =>
      checked
        ? [...new Set([...current, value])]
        : current.filter((item) => item !== value),
    );
  };
  const addLabel = async () => {
    if (busy.current) return;
    const name = normalizeName(newLabel);
    if (name.length < 2 || name.length > 100) {
      setLabelError("Nhập tên nhãn từ 2 đến 100 ký tự.");
      inputRef.current?.focus();
      return;
    }
    if (flags.length >= MAX_REPORT_REVIEW_FLAGS) {
      setLabelError(
        `Chọn tối đa ${MAX_REPORT_REVIEW_FLAGS} nội dung cho một báo cáo.`,
      );
      return;
    }
    busy.current = true;
    setCreating(true);
    setLabelError("");
    try {
      const label =
        await adminOccupationalAccidentReportApi.createReviewLabel(name);
      setLabels((current) =>
        current.some((item) => item.value === label.value)
          ? current
          : [label, ...current],
      );
      setFlags((current) => [...new Set([...current, label.value])]);
      setNewLabel("");
      return label;
    } catch (error) {
      setLabelError(
        getErrorMessage(error, "Không thêm được nhãn. Vui lòng thử lại."),
      );
      return null;
    } finally {
      busy.current = false;
      setCreating(false);
      inputRef.current?.focus();
    }
  };
  const save = async () => {
    if (busy.current || disabled) return;
    let selectedFlags = flags;
    if (newLabel.trim()) {
      const label = await addLabel();
      if (!label) return;
      selectedFlags = [...new Set([...flags, label.value])];
    }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      onSaved(
        await adminOccupationalAccidentReportApi.updateReviewFlags(report.id, {
          flags: selectedFlags,
          version: report.version,
        }),
      );
      setAnchor(null);
      enqueueSnackbar(
        selectedFlags.length
          ? "Đã lưu nội dung cần bổ sung."
          : "Đã bỏ các nhãn của báo cáo.",
        { variant: "success" },
      );
    } catch (error) {
      setError(getErrorMessage(error, "Không lưu được nhãn của báo cáo."));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const reload = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      onSaved(await adminOccupationalAccidentReportApi.get(report.id));
      setAnchor(null);
      enqueueSnackbar(
        "Đã tải báo cáo mới nhất. Vui lòng kiểm tra lại các nhãn.",
        { variant: "info" },
      );
    } catch (error) {
      setError(getErrorMessage(error, "Không tải được báo cáo."));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        color="warning"
        variant="outlined"
        startIcon={<FlagOutlinedIcon />}
        disabled={disabled || saving || creating}
        onClick={(event) => open(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
      >
        Nội dung cần bổ sung
        {report.reviewFlags.length > 0 ? ` (${report.reviewFlags.length})` : ""}
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={saving || creating ? undefined : () => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Stack
          spacing={2}
          sx={{ p: 2, width: 400, maxWidth: "calc(100vw - 32px)" }}
          role="dialog"
          aria-labelledby="report-review-label-title"
        >
          <Typography id="report-review-label-title" sx={{ fontWeight: 600 }}>
            Chọn nội dung cần bổ sung
          </Typography>
          <Stack sx={{ maxHeight: 260, overflowY: "auto" }}>
            {labels.map((label) => (
              <FormControlLabel
                key={label.value}
                sx={{
                  m: 0,
                  ml: -1,
                  alignItems: "flex-start",
                  "& .MuiFormControlLabel-label": {
                    pt: 0.75,
                    overflowWrap: "anywhere",
                  },
                }}
                label={label.label}
                control={
                  <Checkbox
                    size="small"
                    disabled={saving || creating}
                    checked={flags.includes(label.value)}
                    onChange={(_, checked) => toggle(label.value, checked)}
                  />
                }
              />
            ))}
          </Stack>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              void addLabel();
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "flex-start" }}
            >
              <TextField
                fullWidth
                size="small"
                label="Thêm nhãn mới"
                placeholder="Ví dụ: Thiếu số liệu quý III"
                value={newLabel}
                inputRef={inputRef}
                disabled={saving || creating}
                onChange={(event) => {
                  setNewLabel(event.target.value);
                  setLabelError("");
                }}
                error={Boolean(labelError)}
                helperText={labelError || undefined}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <Button
                type="submit"
                variant="outlined"
                disabled={saving || creating || !newLabel.trim()}
                startIcon={
                  creating ? <CircularProgress size={14} /> : <AddIcon />
                }
                sx={{ flexShrink: 0, minHeight: 40 }}
              >
                Thêm
              </Button>
            </Stack>
          </Box>
          {error && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography
                variant="body2"
                color="error"
                role="alert"
                sx={{ flex: 1 }}
              >
                {error}
              </Typography>
              <Button
                size="small"
                onClick={reload}
                disabled={saving || creating}
              >
                Tải lại
              </Button>
            </Stack>
          )}
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flex: 1 }}
              aria-live="polite"
            >
              {flags.length ? `Đã chọn ${flags.length} nhãn` : "Chưa chọn nhãn"}
            </Typography>
            <Button
              disabled={saving || creating}
              onClick={() => setAnchor(null)}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              disabled={saving || creating}
              onClick={save}
            >
              {saving ? "Đang lưu…" : "Lưu lựa chọn"}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
