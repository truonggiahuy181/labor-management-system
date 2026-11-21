"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type {
  AccidentCaseBody,
  OccupationalAccidentCase,
} from "@/services/occupationalAccidentReport";
import AccidentCaseForm, {
  type AccidentCaseFormProps,
} from "./AccidentCaseForm";
import {
  getAccidentCaseErrors,
  isEmptyAccidentCase,
  toAccidentCaseBody,
} from "./accidentCaseValidation";
import {
  MAX_CASES_PER_ADD,
  parseAdditionalCaseCount,
  type AccidentCaseDraft,
} from "./accidentCaseDrafts";

const formatMoney = (value: string) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || "0"));

const CASE_COUNT_FIELDS = [
  ["victimCount", "Tổng số người bị nạn"],
  ["femaleCount", "Tổng số lao động nữ bị nạn"],
  ["deathCount", "Tổng số người bị chết"],
  ["severeCount", "Tổng số người bị thương nặng"],
  ["unmanagedVictimCount", "Số người bị nạn không thuộc quyền quản lý"],
  ["unmanagedFemaleCount", "Lao động nữ bị nạn không thuộc quyền quản lý"],
  ["unmanagedDeathCount", "Số người chết không thuộc quyền quản lý"],
  ["unmanagedSevereCount", "Người bị thương nặng không thuộc quyền quản lý"],
] as const;

type CaseCounts = Record<(typeof CASE_COUNT_FIELDS)[number][0], number>;

const getCounts = (item: OccupationalAccidentCase): CaseCounts =>
  item.victimGroups.reduce<CaseCounts>(
    (total, group) => {
      total.victimCount += group.victimCount;
      total.femaleCount += group.femaleCount;
      total.deathCount += group.deathCount;
      total.severeCount += group.severeCount;
      if (!group.isUnderEnterpriseManagement) {
        total.unmanagedVictimCount += group.victimCount;
        total.unmanagedFemaleCount += group.femaleCount;
        total.unmanagedDeathCount += group.deathCount;
        total.unmanagedSevereCount += group.severeCount;
      }
      return total;
    },
    {
      victimCount: 0,
      femaleCount: 0,
      deathCount: 0,
      severeCount: 0,
      unmanagedVictimCount: 0,
      unmanagedFemaleCount: 0,
      unmanagedDeathCount: 0,
      unmanagedSevereCount: 0,
    },
  );

interface AccidentCasePanelProps {
  cases: OccupationalAccidentCase[];
  noAccidentsDeclared: boolean;
  readOnly: boolean;
  drafts: AccidentCaseDraft[];
  editorProps: Pick<
    AccidentCaseFormProps,
    | "causes"
    | "injuryFactors"
    | "occupations"
    | "totalEmployees"
    | "femaleEmployees"
    | "saving"
  >;
  draftStorageFailed: boolean;
  onAdd: (count: number) => string;
  onChangeDraft: (
    clientId: string,
    body: AccidentCaseBody,
    caseId?: number,
  ) => void;
  onSaveDraft: (
    clientId: string,
    body: AccidentCaseBody,
    caseId?: number,
  ) => Promise<boolean>;
  onRemoveDraft: (clientId: string) => void;
  onRemove: (item: OccupationalAccidentCase) => void;
}

export default function AccidentCasePanel({
  cases,
  noAccidentsDeclared,
  readOnly,
  drafts,
  editorProps,
  draftStorageFailed,
  onAdd,
  onChangeDraft,
  onSaveDraft,
  onRemoveDraft,
  onRemove,
}: AccidentCasePanelProps) {
  const [quantityOpen, setQuantityOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(
    () => drafts[0]?.clientId ?? (cases[0] ? `saved-${cases[0].id}` : null),
  );
  const [focusDraftId, setFocusDraftId] = useState<string | null>(null);
  const [attemptedDrafts, setAttemptedDrafts] = useState<Set<string>>(
    new Set(),
  );
  const additionalCount = parseAdditionalCaseCount(quantity);
  const editableCases: AccidentCaseDraft[] = [
    ...cases.map(
      (item) =>
        drafts.find((draft) => draft.caseId === item.id) ?? {
          clientId: `saved-${item.id}`,
          caseId: item.id,
          body: toAccidentCaseBody(item),
        },
    ),
    ...drafts.filter((draft) => draft.caseId === undefined),
  ];

  useEffect(() => {
    if (!focusDraftId) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`draft-case-${focusDraftId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
      element
        ?.querySelector<HTMLInputElement>(
          'input:not([type="hidden"]):not([aria-hidden="true"])',
        )
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusDraftId]);

  const addDrafts = () => {
    setQuantityTouched(true);
    if (additionalCount === null || editorProps.saving) return;
    const firstId = onAdd(additionalCount);
    setQuantityOpen(false);
    setExpandedDraft(firstId);
    setFocusDraftId(firstId);
  };

  const saveDraft = async (draft: AccidentCaseDraft, index: number) => {
    const nextId = editableCases[index + 1]?.clientId;
    const unchanged =
      draft.caseId !== undefined &&
      !drafts.some((item) => item.clientId === draft.clientId);
    if (
      unchanged ||
      (await onSaveDraft(draft.clientId, draft.body, draft.caseId))
    ) {
      setExpandedDraft(nextId ?? null);
      if (nextId) setFocusDraftId(nextId);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: "center" }}>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>
          Chi tiết các vụ tai nạn lao động
        </Typography>
        {!readOnly && !noAccidentsDeclared && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={editorProps.saving}
            onClick={() => {
              setQuantity("1");
              setQuantityTouched(false);
              setQuantityOpen(true);
            }}
          >
            Thêm vụ tai nạn
          </Button>
        )}
      </Stack>

      {noAccidentsDeclared && (
        <Alert severity="info">
          Doanh nghiệp đã xác nhận không phát sinh tai nạn trong kỳ.
        </Alert>
      )}

      {readOnly &&
        cases.map((item, index) => {
          const counts = getCounts(item);
          const occupations = Array.from(
            new Map(
              item.victimGroups.map((group) => [
                group.occupation.id,
                `${group.occupation.code} - ${group.occupation.name}`,
              ]),
            ).values(),
          ).join("; ");

          return (
            <Accordion
              key={item.id}
              defaultExpanded={index === 0 && drafts.length === 0}
              disableGutters
              variant="outlined"
              sx={{ "&:before": { display: "none" } }}
            >
              <Stack
                direction="row"
                sx={{ alignItems: "center", pr: readOnly ? 0 : 1 }}
              >
                <AccordionSummary
                  id={`saved-case-summary-${item.id}`}
                  aria-controls={`saved-case-details-${item.id}`}
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    Chi tiết vụ tai nạn số {index + 1}
                  </Typography>
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label="Đã lưu"
                    sx={{ ml: 1.5 }}
                  />
                </AccordionSummary>
              </Stack>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    size="small"
                    label="1. Phân theo nguyên nhân xảy ra TNLĐ"
                    value={item.accidentCause.name}
                    slotProps={{ input: { readOnly: true } }}
                  />
                  <TextField
                    size="small"
                    label="2. Phân theo yếu tố gây chấn thương"
                    value={item.injuryFactor.name}
                    slotProps={{ input: { readOnly: true } }}
                  />
                  <TextField
                    size="small"
                    label="3. Phân theo nghề nghiệp"
                    value={occupations}
                    slotProps={{ input: { readOnly: true } }}
                  />
                </Box>

                <Typography sx={{ mt: 2, mb: 1.5, fontWeight: 700 }}>
                  4. Chi tiết vụ tai nạn số {index + 1}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: 1.5,
                  }}
                >
                  {CASE_COUNT_FIELDS.map(([key, label]) => (
                    <TextField
                      key={key}
                      size="small"
                      label={label}
                      value={counts[key]}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  ))}
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography sx={{ mb: 1.5, fontWeight: 700 }}>
                  5. Thiệt hại do tai nạn lao động số {index + 1}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: 1.5,
                  }}
                >
                  {[
                    ["Chi phí y tế", item.medicalCostVnd],
                    [
                      "Chi phí trả lương trong thời gian điều trị",
                      item.salaryCostVnd,
                    ],
                    ["Chi phí bồi thường, trợ cấp", item.compensationCostVnd],
                    ["Tổng số tiền chi phí", item.totalCostVnd],
                    ["Thiệt hại tài sản", item.propertyDamageVnd],
                  ].map(([label, value]) => (
                    <TextField
                      key={label}
                      size="small"
                      label={`${label} (VND)`}
                      value={formatMoney(value)}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  ))}
                  <TextField
                    size="small"
                    label="Tổng số ngày nghỉ vì TNLĐ"
                    value={item.lostWorkDays}
                    slotProps={{ input: { readOnly: true } }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}

      {!readOnly && editableCases.length > 0 && (
        <>
          {noAccidentsDeclared && drafts.length > 0 && (
            <Alert severity="warning">
              Để lưu các vụ đang nhập, hãy bỏ xác nhận không phát sinh tai nạn
              trong thông tin doanh nghiệp. Bạn vẫn có thể xóa các vụ chưa lưu
              bên dưới.
            </Alert>
          )}
          {drafts.length > 0 && (
            <Alert severity={draftStorageFailed ? "warning" : "info"}>
              Còn {drafts.length} vụ chưa hoàn thành yêu cầu nhập.
              {draftStorageFailed
                ? " Không thể tự lưu nháp trên trình duyệt. Hãy hoàn thành từng vụ trước khi rời trang."
                : ""}
            </Alert>
          )}
          {editableCases.map((draft, index) => {
            const number = index + 1;
            const pending = drafts.some(
              (item) => item.clientId === draft.clientId,
            );
            const empty = isEmptyAccidentCase(draft.body);
            const invalid =
              attemptedDrafts.has(draft.clientId) &&
              Object.keys(getAccidentCaseErrors(draft.body, editorProps))
                .length > 0;
            return (
              <Accordion
                key={draft.clientId}
                id={`draft-case-${draft.clientId}`}
                expanded={expandedDraft === draft.clientId}
                onChange={(_, expanded) =>
                  setExpandedDraft(expanded ? draft.clientId : null)
                }
                disableGutters
                variant="outlined"
                sx={{ scrollMarginTop: 96, "&:before": { display: "none" } }}
              >
                <Stack direction="row" sx={{ alignItems: "center", pr: 1 }}>
                  <AccordionSummary
                    id={`draft-case-summary-${draft.clientId}`}
                    aria-controls={`draft-case-details-${draft.clientId}`}
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        Chi tiết vụ tai nạn số {number}
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          !pending
                            ? "Đã lưu"
                            : invalid
                              ? "Cần kiểm tra"
                              : empty
                                ? "Chưa nhập"
                                : "Đang nhập"
                        }
                        color={
                          !pending
                            ? "success"
                            : invalid
                              ? "error"
                              : empty
                                ? "default"
                                : "warning"
                        }
                      />
                    </Stack>
                  </AccordionSummary>
                  <Tooltip title="Xóa vụ tai nạn">
                    <IconButton
                      color="error"
                      size="small"
                      disabled={editorProps.saving}
                      aria-label={`Xóa vụ tai nạn số ${number}`}
                      onClick={() => {
                        if (draft.caseId !== undefined) {
                          const item = cases.find(
                            (item) => item.id === draft.caseId,
                          );
                          if (item) onRemove(item);
                          return;
                        }
                        if (
                          !empty &&
                          !window.confirm(
                            `Xóa nội dung đang nhập của vụ tai nạn số ${number}?`,
                          )
                        )
                          return;
                        onRemoveDraft(draft.clientId);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <AccordionDetails sx={{ pt: 0 }}>
                  {expandedDraft === draft.clientId && (
                    <AccidentCaseForm
                      {...editorProps}
                      value={draft.body}
                      initialAttempted={attemptedDrafts.has(draft.clientId)}
                      onChange={(body) =>
                        onChangeDraft(draft.clientId, body, draft.caseId)
                      }
                      onInvalid={() =>
                        setAttemptedDrafts((current) =>
                          new Set(current).add(draft.clientId),
                        )
                      }
                      onSave={() => {
                        void saveDraft(draft, index);
                      }}
                    />
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </>
      )}

      {!noAccidentsDeclared && cases.length === 0 && drafts.length === 0 && (
        <Card
          variant="outlined"
          sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
        >
          Chưa có vụ tai nạn nào. Hãy thêm chi tiết vụ tai nạn để hệ thống tự
          tổng hợp số liệu.
        </Card>
      )}

      <Dialog
        open={quantityOpen}
        onClose={() => setQuantityOpen(false)}
        maxWidth="xs"
        fullWidth
        disableRestoreFocus
      >
        <Box
          component="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            addDrafts();
          }}
        >
          <DialogTitle>Thêm vụ tai nạn</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Nhập số vụ muốn thêm mới. Các vụ đã có được giữ nguyên.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              required
              type="number"
              label="Số vụ cần thêm"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onFocus={(event) => event.target.select()}
              onBlur={() => setQuantityTouched(true)}
              error={quantityTouched && additionalCount === null}
              helperText={
                quantityTouched && additionalCount === null
                  ? `Vui lòng nhập số nguyên từ 1 đến ${MAX_CASES_PER_ADD}.`
                  : `Có thể thêm tối đa ${MAX_CASES_PER_ADD} vụ mỗi lần và tiếp tục thêm khi cần.`
              }
              slotProps={{
                htmlInput: { min: 1, max: MAX_CASES_PER_ADD, step: 1 },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setQuantityOpen(false)}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={additionalCount === null || editorProps.saving}
            >
              {additionalCount === null
                ? "Thêm vụ"
                : `Thêm ${additionalCount} vụ`}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
