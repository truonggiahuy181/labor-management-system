export const REPORT_REVIEW_FLAGS = [
  {
    value: "MISSING_WORKFORCE",
    label: "Thiếu số liệu lao động",
    reason:
      "Vui lòng bổ sung đầy đủ số liệu lao động tại phần thông tin chung của báo cáo.",
  },
  {
    value: "MISSING_SIGNATURE",
    label: "Tài liệu thiếu chữ ký",
    reason: "Vui lòng bổ sung tài liệu báo cáo có đầy đủ chữ ký, đóng dấu.",
  },
  {
    value: "INCONSISTENT_DATA",
    label: "Số liệu không khớp",
    reason:
      "Vui lòng rà soát, điều chỉnh các số liệu chưa khớp giữa báo cáo và tài liệu đính kèm.",
  },
] as const;

export type ReportReviewFlag = string;
export interface ReportReviewLabel {
  value: ReportReviewFlag;
  label: string;
  reason: string;
}
export const MAX_REPORT_REVIEW_FLAGS = 20;
export type ReportReviewFlagFilter = ReportReviewFlag | "flagged" | "unflagged";
export type ReportReviewFlagCounts = Record<ReportReviewFlagFilter, number>;

export const EMPTY_REVIEW_FLAG_COUNTS: ReportReviewFlagCounts = {
  flagged: 0,
  unflagged: 0,
  MISSING_WORKFORCE: 0,
  MISSING_SIGNATURE: 0,
  INCONSISTENT_DATA: 0,
};

export function combineReviewReason(common: string, additional = "") {
  return [common.trim(), additional.trim()].filter(Boolean).join("\n");
}

export function isValidReviewReason(reason: string) {
  const length = reason.trim().length;
  return length >= 10 && length <= 1000;
}

export function getReviewReasonDraft(
  reports: Array<{ id: number; reviewFlags: ReportReviewFlag[] }>,
  preferredFlag?: ReportReviewFlagFilter | "",
  labels: readonly ReportReviewLabel[] = REPORT_REVIEW_FLAGS,
) {
  const primary =
    labels.find(
      (flag) =>
        reports.length > 0 &&
        flag.value === preferredFlag &&
        reports.every((report) => report.reviewFlags.includes(flag.value)),
    ) ??
    labels.find(
      (flag) =>
        reports.length > 0 &&
        reports.every((report) => report.reviewFlags.includes(flag.value)),
    );
  return {
    reason: primary?.reason ?? "",
    additionalReasons: Object.fromEntries(
      reports.map((report) => [
        report.id,
        labels
          .filter(
            (flag) =>
              flag.value !== primary?.value &&
              report.reviewFlags.includes(flag.value),
          )
          .map((flag) => flag.reason)
          .join("\n"),
      ]),
    ) as Record<number, string>,
  };
}
