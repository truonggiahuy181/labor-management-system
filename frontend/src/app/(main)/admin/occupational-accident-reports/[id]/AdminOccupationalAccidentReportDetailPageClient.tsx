'use client';

import { useParams } from 'next/navigation';
import { Alert } from '@mui/material';
import AdminReportReview from '@/Components/AdminOccupationalAccidentReport/AdminReportReview';
import useAuth from '@/Hooks/useAuth';
import { ROLE } from '@/constants/roles';

export default function AdminOccupationalAccidentReportDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const reportId = Number(params.id);

  if (user && user.roleId !== ROLE.ADMIN) {
    return <Alert severity="warning">Chức năng này chỉ dành cho quản trị viên.</Alert>;
  }
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return <Alert severity="error">Mã báo cáo không hợp lệ.</Alert>;
  }

  return <AdminReportReview reportId={reportId} />;
}
