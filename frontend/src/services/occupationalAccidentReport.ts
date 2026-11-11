import api from "./api";
import type { BackendResponse } from "./user";

export type OccupationalAccidentReportStatus =
  "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "RECEIVED" | "RETURNED";

export type OccupationalAccidentPeriodCode = "FIRST_HALF" | "ANNUAL";

export const getOccupationalAccidentCoverage = (
  reportYear: number,
  periodCode: string,
) => ({
  startDate: `${reportYear}-01-01`,
  endDate:
    periodCode === "FIRST_HALF" ? `${reportYear}-06-30` : `${reportYear}-12-31`,
});

export interface OccupationalAccidentReportListItem {
  id: number | null;
  enterpriseId: number;
  reportPeriodId: number;
  reportName: string;
  reportYear: number;
  periodCode: OccupationalAccidentPeriodCode;
  submissionStartDate: string;
  submissionEndDate: string;
  isSubmissionOpen: boolean;
  status: OccupationalAccidentReportStatus;
  noAccidentsDeclared: boolean;
  submittedAt: string | null;
  receivedAt: string | null;
  updatedAt: string;
}

export type ReviewableOccupationalAccidentReportStatus = Exclude<
  OccupationalAccidentReportStatus,
  "NOT_STARTED" | "DRAFT"
>;

export interface AdminOccupationalAccidentReportListItem {
  id: number;
  enterpriseId: number;
  enterpriseName: string;
  taxCode: string;
  reportPeriodId: number;
  reportName: string;
  reportYear: number;
  periodCode: OccupationalAccidentPeriodCode;
  submissionStartDate: string;
  submissionEndDate: string;
  status: ReviewableOccupationalAccidentReportStatus;
  noAccidentsDeclared: boolean;
  submittedAt: string | null;
  receivedAt: string | null;
  returnedAt: string | null;
  updatedAt: string;
}

export interface AdminOccupationalAccidentReportPage {
  data: AdminOccupationalAccidentReportListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminOccupationalAccidentReportFilters {
  search?: string;
  enterpriseName?: string;
  taxCode?: string;
  year?: number;
  reportPeriodId?: number;
  status?: ReviewableOccupationalAccidentReportStatus;
  provinceId?: string;
  wardId?: string;
  page?: number;
  pageSize?: number;
}

export interface AccidentCause {
  id: number;
  causeCode: string;
  causeName: string;
  causeGroup: "EMPLOYER" | "EMPLOYEE";
  displayOrder: number;
  isActive: boolean;
}

export interface AccidentCountMetrics {
  totalCases: number;
  fatalCases: number;
  multiVictimCases: number;
  victimCount: number;
  femaleCount: number;
  deathCount: number;
  severeCount: number;
  unmanagedVictimCount: number;
  unmanagedFemaleCount: number;
  unmanagedDeathCount: number;
  unmanagedSevereCount: number;
}

export interface AccidentSummary extends AccidentCountMetrics {
  medicalCostVnd: string;
  salaryCostVnd: string;
  compensationCostVnd: string;
  totalCostVnd: string;
  lostWorkDays: number;
  propertyDamageVnd: string;
}

export interface AccidentBreakdownRow extends AccidentSummary {
  id: number;
  code: string;
  name: string;
}

export interface OccupationalAccidentOverview {
  regular: AccidentSummary;
  article39: AccidentSummary;
  grandTotal: AccidentSummary;
  byCause: AccidentBreakdownRow[];
  byInjuryFactor: AccidentBreakdownRow[];
  byOccupation: AccidentBreakdownRow[];
}

export interface OccupationalAccidentBusinessTypeSummary {
  code: string;
  name: string;
  totalEnterpriseCount: number;
  enterpriseCount: number;
  totalEmployees: number;
  femaleEmployees: number;
  payrollFundVnd: string;
  accidentSummary: AccidentSummary;
}

export interface AdminOccupationalAccidentSummary {
  reportCount: number;
  registeredEnterpriseCount: number;
  enterpriseCount: number;
  totalEmployees: number;
  femaleEmployees: number;
  payrollFundVnd: string;
  overview: OccupationalAccidentOverview;
  byIndustry: AccidentBreakdownRow[];
  byBusinessType: OccupationalAccidentBusinessTypeSummary[];
}

export interface AccidentVictimGroupBody {
  occupationId: number;
  isUnderEnterpriseManagement: boolean;
  victimCount: number;
  femaleCount: number;
  deathCount: number;
  severeCount: number;
}

export interface AccidentCaseBody {
  accidentDate: string;
  primaryCauseId: number;
  injuryFactorId: number;
  medicalCostVnd: string;
  salaryCostVnd: string;
  compensationCostVnd: string;
  lostWorkDays: number;
  propertyDamageVnd: string;
  victimGroups: AccidentVictimGroupBody[];
}

export interface OccupationalAccidentCase {
  id: number;
  accidentDate: string;
  accidentCause: {
    id: number;
    code: string;
    name: string;
    group: "EMPLOYER" | "EMPLOYEE";
  };
  injuryFactor: { id: number; code: string; name: string };
  medicalCostVnd: string;
  salaryCostVnd: string;
  compensationCostVnd: string;
  totalCostVnd: string;
  lostWorkDays: number;
  propertyDamageVnd: string;
  victimGroups: Array<{
    id: number;
    occupation: { id: number; code: string; name: string };
    isUnderEnterpriseManagement: boolean;
    victimCount: number;
    femaleCount: number;
    deathCount: number;
    severeCount: number;
  }>;
}

export interface UpdateReportHeaderBody {
  totalEmployees: number;
  femaleEmployees: number;
  payrollFundVnd: string;
  noAccidentsDeclared: boolean;
}

export interface Article39SummaryBody {
  totalCases: number;
  fatalCases: number;
  multiVictimCases: number;
  victimCount: number;
  femaleCount: number;
  deathCount: number;
  severeCount: number;
  unmanagedVictimCount: number;
  unmanagedFemaleCount: number;
  unmanagedDeathCount: number;
  unmanagedSevereCount: number;
  medicalCostVnd: string;
  salaryCostVnd: string;
  compensationCostVnd: string;
  lostWorkDays: number;
  propertyDamageVnd: string;
}

export interface OccupationalAccidentReport {
  id: number;
  enterpriseId: number;
  reportPeriodId: number;
  status: Exclude<OccupationalAccidentReportStatus, "NOT_STARTED">;
  enterprise: {
    enterpriseName: string;
    taxCode: string;
    address: string;
    businessTypeCode: string;
    businessTypeName: string;
    industryCode: string;
    industryName: string;
  };
  reportPeriod: {
    reportName: string;
    reportYear: number;
    reportTypeCode: "OCCUPATIONAL_ACCIDENT";
    periodCode: OccupationalAccidentPeriodCode;
    submissionStartDate: string;
    submissionEndDate: string;
    isSubmissionOpen: boolean;
  };
  totalEmployees: number;
  femaleEmployees: number;
  payrollFundVnd: string;
  noAccidentsDeclared: boolean;
  headerCompleted: boolean;
  signedDocument: {
    objectKey: string;
    originalName: string;
    contentType: string;
    size: string;
    uploadedAt: string;
    submissionNo: number | null;
    isDraft: boolean;
  } | null;
  submissions: Array<{
    id: number;
    submissionNo: number;
    reportDate: string;
    submittedAt: string;
    documentOriginalName: string;
    documentSize: string;
    documentSha256: string;
  }>;
  article39Summary: AccidentSummary;
  cases: OccupationalAccidentCase[];
  version: number;
  submittedAt: string | null;
  receivedAt: string | null;
  returnedAt: string | null;
  returnedReason: string | null;
  createdAt: string;
  updatedAt: string;
  history?: Array<{
    id: number;
    fromStatus: Exclude<OccupationalAccidentReportStatus, "NOT_STARTED"> | null;
    toStatus: Exclude<OccupationalAccidentReportStatus, "NOT_STARTED">;
    reason: string | null;
    performedBy: number | null;
    performedAt: string;
  }>;
}

export interface SignedReportDocumentAccess {
  objectKey: string;
  originalName: string;
  contentType: string;
  size: string;
  uploadedAt: string;
  submissionNo: number | null;
  isDraft: boolean;
  accessUrl: string;
}

export const occupationalAccidentReportApi = {
  listMine: (year?: number) =>
    api
      .get<BackendResponse<OccupationalAccidentReportListItem[]>>(
        "/occupational-accident-reports/me",
        { params: year ? { year } : undefined },
      )
      .then((response) => response.data.data ?? []),
  createDraft: (reportPeriodId: number) =>
    api
      .post<BackendResponse<OccupationalAccidentReport>>(
        "/occupational-accident-reports/me",
        { reportPeriodId },
      )
      .then((response) => response.data.data),
  getMine: (id: number) =>
    api
      .get<BackendResponse<OccupationalAccidentReport>>(
        `/occupational-accident-reports/me/${id}`,
      )
      .then((response) => response.data.data),
  updateHeader: (id: number, body: UpdateReportHeaderBody) =>
    api
      .patch<BackendResponse<OccupationalAccidentReport>>(
        `/occupational-accident-reports/me/${id}/header`,
        body,
      )
      .then((response) => response.data.data),
  createCase: (id: number, body: AccidentCaseBody) =>
    api
      .post<BackendResponse<OccupationalAccidentCase>>(
        `/occupational-accident-reports/me/${id}/cases`,
        body,
      )
      .then((response) => response.data.data),
  updateCase: (id: number, caseId: number, body: AccidentCaseBody) =>
    api
      .put<BackendResponse<OccupationalAccidentCase>>(
        `/occupational-accident-reports/me/${id}/cases/${caseId}`,
        body,
      )
      .then((response) => response.data.data),
  removeCase: (id: number, caseId: number) =>
    api
      .delete(`/occupational-accident-reports/me/${id}/cases/${caseId}`)
      .then(() => undefined),
  updateArticle39: (id: number, body: Article39SummaryBody) =>
    api
      .put<BackendResponse<OccupationalAccidentReport>>(
        `/occupational-accident-reports/me/${id}/article-39-summary`,
        body,
      )
      .then((response) => response.data.data),
  uploadSignedDocument: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<BackendResponse<OccupationalAccidentReport>>(
        `/occupational-accident-reports/me/${id}/signed-document`,
        form,
      )
      .then((response) => response.data.data);
  },
  removeSignedDocument: (id: number) =>
    api
      .delete<BackendResponse<OccupationalAccidentReport>>(
        `/occupational-accident-reports/me/${id}/signed-document`,
      )
      .then((response) => response.data.data),
  signedDocumentAccess: (id: number) =>
    api
      .get<BackendResponse<SignedReportDocumentAccess>>(
        `/occupational-accident-reports/me/${id}/signed-document/access-url`,
      )
      .then((response) => response.data.data),
  overview: (id: number) =>
    api
      .get<BackendResponse<OccupationalAccidentOverview>>(
        `/occupational-accident-reports/me/${id}/overview`,
      )
      .then((response) => response.data.data),
  submit: (id: number) =>
    api
      .post<BackendResponse<OccupationalAccidentReport>>(
        `/occupational-accident-reports/me/${id}/submit`,
      )
      .then((response) => response.data.data),
};

export const adminOccupationalAccidentReportApi = {
  list: (params: AdminOccupationalAccidentReportFilters = {}) =>
    api
      .get<BackendResponse<AdminOccupationalAccidentReportPage>>(
        "/admin/occupational-accident-reports",
        { params },
      )
      .then((response) => response.data.data),
  get: (id: number) =>
    api
      .get<BackendResponse<OccupationalAccidentReport>>(
        `/admin/occupational-accident-reports/${id}`,
      )
      .then((response) => response.data.data),
  overview: (id: number) =>
    api
      .get<BackendResponse<OccupationalAccidentOverview>>(
        `/admin/occupational-accident-reports/${id}/overview`,
      )
      .then((response) => response.data.data),
  signedDocumentAccess: (id: number) =>
    api
      .get<BackendResponse<SignedReportDocumentAccess>>(
        `/admin/occupational-accident-reports/${id}/signed-document/access-url`,
      )
      .then((response) => response.data.data),
  receive: (id: number) =>
    api
      .post<BackendResponse<OccupationalAccidentReport>>(
        `/admin/occupational-accident-reports/${id}/receive`,
      )
      .then((response) => response.data.data),
  returnForSupplement: (id: number, reason: string) =>
    api
      .post<BackendResponse<OccupationalAccidentReport>>(
        `/admin/occupational-accident-reports/${id}/return`,
        { reason },
      )
      .then((response) => response.data.data),
  summary: (
    params: Pick<
      AdminOccupationalAccidentReportFilters,
      "year" | "reportPeriodId"
    >,
  ) =>
    api
      .get<BackendResponse<AdminOccupationalAccidentSummary>>(
        "/admin/occupational-accident-reports/summary",
        { params },
      )
      .then((response) => response.data.data),
};

export const accidentCauseApi = {
  list: () =>
    api
      .get<BackendResponse<AccidentCause[]>>("/accident-causes")
      .then((response) => response.data.data ?? []),
};
