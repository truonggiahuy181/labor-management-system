export const OccupationalAccidentReportStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  RECEIVED: 'RECEIVED',
  RETURNED: 'RETURNED',
} as const;

export type OccupationalAccidentReportStatus =
  (typeof OccupationalAccidentReportStatus)[keyof typeof OccupationalAccidentReportStatus];

export const OccupationalAccidentReportListStatus = {
  ...OccupationalAccidentReportStatus,
  NOT_STARTED: 'NOT_STARTED',
} as const;

export type OccupationalAccidentReportListStatus =
  (typeof OccupationalAccidentReportListStatus)[keyof typeof OccupationalAccidentReportListStatus];
