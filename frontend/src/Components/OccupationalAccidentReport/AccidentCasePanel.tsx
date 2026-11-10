"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { OccupationalAccidentCase } from "@/services/occupationalAccidentReport";

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

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
  onAdd: () => void;
  onEdit: (item: OccupationalAccidentCase) => void;
  onRemove: (item: OccupationalAccidentCase) => void;
}

export default function AccidentCasePanel({
  cases,
  noAccidentsDeclared,
  readOnly,
  onAdd,
  onEdit,
  onRemove,
}: AccidentCasePanelProps) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: "center" }}>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>
          Chi tiết các vụ tai nạn lao động
        </Typography>
        {!readOnly && !noAccidentsDeclared && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            Thêm vụ tai nạn
          </Button>
        )}
      </Stack>

      {noAccidentsDeclared && (
        <Alert severity="info">
          Doanh nghiệp đã xác nhận không phát sinh tai nạn trong kỳ.
        </Alert>
      )}

      {cases.map((item, index) => {
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
            defaultExpanded={index === 0}
            disableGutters
            variant="outlined"
            sx={{ "&:before": { display: "none" } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                sx={{ alignItems: "center", width: "100%" }}
              >
                <Typography sx={{ flex: 1, fontWeight: 700 }}>
                  Chi tiết vụ tai nạn số {index + 1}
                </Typography>
                {!readOnly && (
                  <>
                    <Tooltip title="Chỉnh sửa">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(item);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            </AccordionSummary>
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
                <TextField
                  size="small"
                  label="Ngày xảy ra tai nạn"
                  value={formatDate(item.accidentDate)}
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

      {!noAccidentsDeclared && cases.length === 0 && (
        <Card
          variant="outlined"
          sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
        >
          Chưa có vụ tai nạn nào. Hãy thêm chi tiết vụ tai nạn để hệ thống tự
          tổng hợp số liệu.
        </Card>
      )}
    </Stack>
  );
}
