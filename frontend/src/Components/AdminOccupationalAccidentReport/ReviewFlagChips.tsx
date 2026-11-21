import { Chip, Stack } from "@mui/material";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import {
  REPORT_REVIEW_FLAGS,
  type ReportReviewFlag,
  type ReportReviewLabel,
} from "@/constants/reportReviewFlags";

export default function ReviewFlagChips({
  flags,
  labels = REPORT_REVIEW_FLAGS,
}: {
  flags: ReportReviewFlag[];
  labels?: readonly ReportReviewLabel[];
}) {
  if (!flags.length) return null;
  return (
    <Stack
      direction="row"
      useFlexGap
      spacing={0.5}
      sx={{ flexWrap: "wrap" }}
      aria-label="Nội dung cần bổ sung"
    >
      {[...new Set(flags)].map((value) => {
        const label =
          labels.find((item) => item.value === value)?.label ?? value;
        return (
          <Chip
            key={value}
            size="small"
            color="warning"
            variant="outlined"
            icon={<FlagOutlinedIcon />}
            label={label}
            sx={{
              maxWidth: "100%",
              height: "auto",
              "& .MuiChip-label": { whiteSpace: "normal", py: 0.3 },
            }}
          />
        );
      })}
    </Stack>
  );
}
