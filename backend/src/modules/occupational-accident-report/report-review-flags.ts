export const REPORT_REVIEW_FLAGS = [
  'MISSING_WORKFORCE',
  'MISSING_SIGNATURE',
  'INCONSISTENT_DATA',
] as const;

export const REPORT_REVIEW_FLAG_SOURCE =
  '(?:MISSING_WORKFORCE|MISSING_SIGNATURE|INCONSISTENT_DATA|CUSTOM_[A-F0-9]{32})';
export const REPORT_REVIEW_FLAG_PATTERN = new RegExp(
  `^${REPORT_REVIEW_FLAG_SOURCE}$`,
);
export const MAX_REPORT_REVIEW_FLAGS = 20;

export type ReportReviewFlag = string;
export type ReportReviewFlagFilter = ReportReviewFlag | 'flagged' | 'unflagged';
export type ReportReviewFlagCounts = Record<ReportReviewFlagFilter, number>;

export interface ReportReviewLabel {
  value: string;
  label: string;
  reason: string;
}

export const normalizeReviewLabel = (value: unknown): unknown =>
  typeof value === 'string'
    ? value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
    : value;
