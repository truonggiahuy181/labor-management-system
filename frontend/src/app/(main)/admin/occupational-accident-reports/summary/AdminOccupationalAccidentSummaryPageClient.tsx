"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import { useSnackbar } from "notistack";
import AdminSummaryTables from "@/Components/AdminOccupationalAccidentReport/AdminSummaryTables";
import useAuth from "@/Hooks/useAuth";
import { ROLE } from "@/constants/roles";
import {
  adminOccupationalAccidentReportApi,
  type AdminOccupationalAccidentSummary,
} from "@/services/occupationalAccidentReport";
import {
  getReportPeriodLabel,
  reportPeriodApi,
  type ReportPeriod,
} from "@/services/reportPeriod";
import { getErrorMessage } from "@/services/user";

export default function AdminOccupationalAccidentSummaryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = user?.roleId === ROLE.ADMIN;
  const yearParam = searchParams.get("year");
  const periodParam = searchParams.get("reportPeriodId");
  const year =
    yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : undefined;
  const reportPeriodId =
    periodParam && /^\d+$/.test(periodParam) ? Number(periodParam) : undefined;
  const [summary, setSummary] =
    useState<AdminOccupationalAccidentSummary | null>(null);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    Promise.all([
      adminOccupationalAccidentReportApi.summary({ year, reportPeriodId }),
      reportPeriodApi.list(true),
    ])
      .then(([nextSummary, nextPeriods]) => {
        if (!cancelled) {
          setSummary(nextSummary);
          setPeriods(nextPeriods);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(
            getErrorMessage(error, "Không tải được báo cáo tổng hợp."),
            { variant: "error" },
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar, isAdmin, reportPeriodId, year]);

  const period = useMemo(
    () => periods.find((item) => item.id === reportPeriodId),
    [periods, reportPeriodId],
  );
  const scopeLabel = period
    ? `${getReportPeriodLabel(period.periodCode)} ${period.reportYear}`
    : year
      ? `Năm ${year}`
      : "Tất cả các kỳ";

  if (user && !isAdmin) {
    return (
      <Alert severity="warning">
        Chức năng này chỉ dành cho quản trị viên.
      </Alert>
    );
  }
  if (loading) return <LinearProgress />;
  if (!summary)
    return <Alert severity="error">Không tải được báo cáo tổng hợp.</Alert>;

  return (
    <Stack spacing={1.5} className="print-document">
      <Card
        square
        elevation={1}
        className="no-print"
        sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1 }}
      >
        <IconButton
          size="small"
          onClick={() => router.push("/admin/occupational-accident-reports")}
          aria-label="Quay lại"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            Báo cáo tổng hợp tai nạn lao động
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {scopeLabel}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PrintOutlinedIcon />}
          onClick={() => window.print()}
        >
          In báo cáo
        </Button>
      </Card>

      <Card variant="outlined" sx={{ px: 2, py: 1.25 }}>
        <Typography sx={{ fontWeight: 700 }}>
          Báo cáo tổng hợp tình hình tai nạn lao động
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Phạm vi: {scopeLabel} · Chỉ bao gồm báo cáo đã tiếp nhận
        </Typography>
      </Card>

      <AdminSummaryTables summary={summary} />
    </Stack>
  );
}
