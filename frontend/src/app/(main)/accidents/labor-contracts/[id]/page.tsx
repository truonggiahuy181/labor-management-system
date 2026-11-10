"use client";

import { useParams } from "next/navigation";
import { Alert } from "@mui/material";
import ReportWorkspace from "@/Components/OccupationalAccidentReport/ReportWorkspace";
import AdminReportReview from "@/Components/OccupationalAccidentReport/AdminReportReview";
import useAuth from "@/Hooks/useAuth";
import { hasRole } from "@/constants/roles";

export default function OccupationalAccidentReportDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams<{ id: string }>();
  const reportId = Number(params.id);

  if (loading) return null;
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return <Alert severity="error">Mã báo cáo không hợp lệ.</Alert>;
  }
  if (hasRole(user, 'ADMIN')) {
    return <AdminReportReview reportId={reportId} />;
  }
  if (!hasRole(user, 'ENTERPRISE')) {
    return (
      <Alert severity="warning">
        Chức năng này dành cho tài khoản doanh nghiệp.
      </Alert>
    );
  }
  return <ReportWorkspace reportId={reportId} />;
}
