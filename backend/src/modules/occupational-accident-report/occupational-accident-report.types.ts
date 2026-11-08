import type { OccupationalAccidentReportListStatus } from './occupational-accident-report.constants.js';
import type { OccupationalAccidentReportStatus } from './occupational-accident-report.constants.js';

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

export interface AccidentDamageMetrics {
  medicalCostVnd: string;
  salaryCostVnd: string;
  compensationCostVnd: string;
  totalCostVnd: string;
  lostWorkDays: number;
  propertyDamageVnd: string;
}

export interface AccidentSummary
  extends AccidentCountMetrics, AccidentDamageMetrics {}

export interface AccidentBreakdownRow extends AccidentCountMetrics {
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

export interface OccupationalAccidentReportListItem {
  id: number | null;
  enterpriseId: number;
  reportPeriodId: number;
  reportName: string;
  reportYear: number;
  periodCode: string;
  submissionStartDate: string;
  submissionEndDate: string;
  isSubmissionOpen: boolean;
  status: OccupationalAccidentReportListStatus;
  noAccidentsDeclared: boolean;
  submittedAt: Date | null;
  receivedAt: Date | null;
  updatedAt: Date;
}

export interface AdminOccupationalAccidentReportListItem {
  id: number;
  enterpriseId: number;
  enterpriseName: string;
  taxCode: string;
  reportPeriodId: number;
  reportName: string;
  reportYear: number;
  periodCode: string;
  submissionStartDate: string;
  submissionEndDate: string;
  status: OccupationalAccidentReportStatus;
  noAccidentsDeclared: boolean;
  submittedAt: Date | null;
  receivedAt: Date | null;
  returnedAt: Date | null;
  updatedAt: Date;
}

export interface AdminOccupationalAccidentReportPage {
  data: AdminOccupationalAccidentReportListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OccupationalAccidentBusinessTypeSummary {
  code: string;
  name: string;
  enterpriseCount: number;
  totalEmployees: number;
  femaleEmployees: number;
  payrollFundVnd: string;
  accidentSummary: AccidentSummary;
}

export interface AdminOccupationalAccidentSummary {
  reportCount: number;
  enterpriseCount: number;
  totalEmployees: number;
  femaleEmployees: number;
  payrollFundVnd: string;
  overview: OccupationalAccidentOverview;
  byBusinessType: OccupationalAccidentBusinessTypeSummary[];
}
