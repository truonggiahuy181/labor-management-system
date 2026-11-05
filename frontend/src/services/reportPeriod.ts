import api from './api';
import type { BackendResponse } from './user';

export interface ReportPeriod {
  id: number;
  reportName: string;
  reportYear: number;
  reportPeriod: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReportPeriodBody = Pick<
  ReportPeriod,
  'reportName' | 'reportYear' | 'reportPeriod' | 'startDate' | 'endDate' | 'isActive'
>;

export const reportPeriodApi = {
  list: (includeInactive = true) =>
    api
      .get<BackendResponse<ReportPeriod[]>>('/report-periods', { params: { includeInactive } })
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
      .patch<BackendResponse<ReportPeriod>>(`/report-periods/${id}/status`, { isActive })
      .then((response) => response.data.data),
};
