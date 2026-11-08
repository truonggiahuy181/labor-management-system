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

export const inferReportTypeCode = (reportName: string): ReportTypeCode => {
  const normalized = reportName.trim().toLocaleLowerCase('vi');
  return normalized.includes('tai nạn lao động') ||
    normalized.includes('tnlđ') ||
    normalized.includes('tnld')
    ? 'OCCUPATIONAL_ACCIDENT'
    : 'OTHER';
};

export const inferReportPeriodCode = (
  reportPeriod: string,
  reportTypeCode: ReportTypeCode,
): ReportPeriodCode => {
  if (reportTypeCode !== 'OCCUPATIONAL_ACCIDENT') return 'CUSTOM';
  const normalized = reportPeriod.trim().toLocaleLowerCase('vi');
  if (normalized.includes('6 tháng đầu')) return 'FIRST_HALF';
  if (normalized.includes('cả năm')) return 'ANNUAL';
  return 'CUSTOM';
};

export const getOccupationalAccidentSubmissionWindow = (
  reportYear: number,
  periodCode: ReportPeriodCode,
): OccupationalAccidentSubmissionWindow | null => {
  if (!Number.isInteger(reportYear) || reportYear < 2000 || reportYear > 2100) {
    return null;
  }
  // Khoản 1 Điều 24 Nghị định 39/2016/NĐ-CP quy định các hạn gửi này
  // theo dạng "trước ngày", nên ngày 05/07 và 10/01 không được tính.
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

export interface ReportPeriod {
  id: number;
  reportName: string;
  reportYear: number;
  reportPeriod: string;
  reportTypeCode: ReportTypeCode;
  periodCode: ReportPeriodCode;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReportPeriodBody = Pick<
  ReportPeriod,
  | 'reportName'
  | 'reportYear'
  | 'reportPeriod'
  | 'startDate'
  | 'endDate'
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
