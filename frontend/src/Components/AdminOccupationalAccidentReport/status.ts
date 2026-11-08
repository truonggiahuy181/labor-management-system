import type { ReviewableOccupationalAccidentReportStatus } from '@/services/occupationalAccidentReport';

export const ADMIN_REPORT_STATUS: Record<
  ReviewableOccupationalAccidentReportStatus,
  {
    label: string;
    color: 'primary' | 'success' | 'warning';
  }
> = {
  SUBMITTED: { label: 'Đã gửi', color: 'primary' },
  RECEIVED: { label: 'Đã tiếp nhận', color: 'success' },
  RETURNED: { label: 'Yêu cầu bổ sung', color: 'warning' },
};

export const formatReportDate = (value?: string | null) => {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export const formatReportDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
};

export const formatReportMoney = (value: string | number) =>
  new Intl.NumberFormat('vi-VN').format(BigInt(String(value || 0)));
