import api from './api';
import type { BackendResponse } from './user';

export type ReportTypeCode = 'OCCUPATIONAL_ACCIDENT' | 'OTHER';
export type ReportPeriodCode = 'FIRST_HALF' | 'ANNUAL' | 'CUSTOM';

export interface OccupationalAccidentSubmissionWindow {
  firstSubmissionDate: string;
  deadlineExclusive: string;
  lastSubmissionDate: string;
  messageKey:
    | 'reportPeriods.firstHalfSubmissionWindow'
    | 'reportPeriods.annualSubmissionWindow';
}

export const getOccupationalAccidentSubmissionWindow = (
  reportYear: number,
  periodCode: ReportPeriodCode,
): OccupationalAccidentSubmissionWindow | null => {
  if (!Number.isInteger(reportYear) || reportYear < 2000 || reportYear > 2100) {
    return null;
  }
  // Điều 24 Nghị định 39/2016/NĐ-CP quy định hạn theo dạng "trước ngày".
  if (periodCode === 'FIRST_HALF') {
    return {
      firstSubmissionDate: `${reportYear}-07-01`,
      deadlineExclusive: `${reportYear}-07-05`,
      lastSubmissionDate: `${reportYear}-07-04`,
      messageKey: 'reportPeriods.firstHalfSubmissionWindow',
    };
  }
  if (periodCode === 'ANNUAL') {
    const submissionYear = reportYear + 1;
    return {
      firstSubmissionDate: `${submissionYear}-01-01`,
      deadlineExclusive: `${submissionYear}-01-10`,
      lastSubmissionDate: `${submissionYear}-01-09`,
      messageKey: 'reportPeriods.annualSubmissionWindow',
    };
  }
  return null;
};

export const getReportPeriodLabel = (periodCode: ReportPeriodCode) => {
  if (periodCode === 'FIRST_HALF') return '6 tháng đầu năm';
  if (periodCode === 'ANNUAL') return 'Cả năm';
  return 'Kỳ tùy chỉnh';
};

export const getReportTypeLabel = (reportTypeCode: ReportTypeCode) =>
  reportTypeCode === 'OCCUPATIONAL_ACCIDENT'
    ? 'Báo cáo tai nạn lao động'
    : 'Báo cáo khác';

export interface ReportPeriod {
  id: number;
  reportName: string;
  reportYear: number;
  reportTypeCode: ReportTypeCode;
  periodCode: ReportPeriodCode;
  submissionStartDate: string;
  submissionEndDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReportPeriodBody = Pick<
  ReportPeriod,
  | 'reportName'
  | 'reportYear'
  | 'reportTypeCode'
  | 'periodCode'
  | 'submissionStartDate'
  | 'submissionEndDate'
  | 'isActive'
>;

export const reportPeriodApi = {
  list: (includeInactive = true) =>
    api
      .get<BackendResponse<ReportPeriod[]>>('/report-periods', {
        params: { includeInactive },
      })
      .then((response) => response.data.data ?? []),
  create: (body: ReportPeriodBody) =>
    api
      .post<BackendResponse<ReportPeriod>>('/report-periods', body)
      .then((response) => response.data.data),
  update: (id: number, body: ReportPeriodBody) =>
    api
      .patch<BackendResponse<ReportPeriod>>(`/report-periods/${id}`, body)
      .then((response) => response.data.data),
  updateStatus: (id: number, isActive: boolean) =>
    api
      .patch<BackendResponse<ReportPeriod>>(`/report-periods/${id}/status`, {
        isActive,
      })
      .then((response) => response.data.data),
};
