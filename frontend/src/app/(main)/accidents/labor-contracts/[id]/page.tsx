"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Alert, LinearProgress } from "@mui/material";
import ReportWorkspace from "@/Components/OccupationalAccidentReport/ReportWorkspace";
import useAuth from "@/Hooks/useAuth";
import { hasRole } from "@/constants/roles";

export default function OccupationalAccidentReportDetailPage() {
  return (
    <Suspense fallback={<LinearProgress />}>
      <OccupationalAccidentReportDetailContent />
    </Suspense>
  );
}

function OccupationalAccidentReportDetailContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const reportId = Number(params.id);
  const validId = Number.isInteger(reportId) && reportId > 0;
  const isAdmin = hasRole(user, "ADMIN");

  // Admin duyệt báo cáo ở màn hình riêng
  useEffect(() => {
    if (isAdmin && validId)
      router.replace(`/admin/occupational-accident-reports/${reportId}`);
  }, [isAdmin, validId, reportId, router]);

  if (loading) return null;
  if (!validId) {
    return <Alert severity="error">Mã báo cáo không hợp lệ.</Alert>;
  }
  if (isAdmin) return <LinearProgress />;
  if (!hasRole(user, "ENTERPRISE")) {
    return (
      <Alert severity="warning">
        Chức năng này dành cho tài khoản doanh nghiệp.
      </Alert>
    );
  }
  return (
    <ReportWorkspace
      reportId={reportId}
      initialOverview={searchParams.get("section") === "overview"}
    />
  );
}
