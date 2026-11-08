export const ReportTypeCode = {
  OCCUPATIONAL_ACCIDENT: 'OCCUPATIONAL_ACCIDENT',
  OTHER: 'OTHER',
} as const;

export type ReportTypeCode =
  (typeof ReportTypeCode)[keyof typeof ReportTypeCode];

export const ReportPeriodCode = {
  FIRST_HALF: 'FIRST_HALF',
  ANNUAL: 'ANNUAL',
  CUSTOM: 'CUSTOM',
} as const;

export type ReportPeriodCode =
  (typeof ReportPeriodCode)[keyof typeof ReportPeriodCode];
