import type { OccupationalAccidentReportStatus } from "@/services/occupationalAccidentReport";

const STATUS = {
  NOT_STARTED: { label: "Chưa khai báo", color: "default" },
  DRAFT: { label: "Đang khai báo", color: "info" },
  SUBMITTED: { label: "Đã gửi", color: "primary" },
  RECEIVED: { label: "Đã tiếp nhận", color: "success" },
  RETURNED: { label: "Yêu cầu bổ sung", color: "warning" },
} as const;

export const getReportStatus = (
  status: OccupationalAccidentReportStatus,
  submissionEndDate: string,
  now = new Date(),
) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const datePart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

  if (
    status !== "SUBMITTED" &&
    status !== "RECEIVED" &&
    today > submissionEndDate.slice(0, 10)
  ) {
    return { label: "Quá hạn", color: "error" } as const;
  }
  return STATUS[status];
};
