import {
  adminOccupationalAccidentReportApi,
  type AdminOccupationalAccidentReportListItem,
} from "@/services/occupationalAccidentReport";
import { getErrorMessage } from "@/services/user";

export type BulkReviewAction = "receive" | "return";

export interface BulkReviewFailure {
  report: AdminOccupationalAccidentReportListItem;
  message: string;
}

// Giới hạn số yêu cầu đồng thời; mỗi báo cáo vẫn được BE kiểm tra và ghi lịch sử.
const CONCURRENT_REVIEWS = 4;

export async function reviewReportBatch(
  reports: AdminOccupationalAccidentReportListItem[],
  action: BulkReviewAction,
  reason: string,
  onProgress: (completed: number) => void,
) {
  const eligible = reports.filter((report) => report.status === "SUBMITTED");
  const normalizedReason = reason.trim();
  if (
    action === "return" &&
    (normalizedReason.length < 10 || normalizedReason.length > 1000)
  ) {
    throw new Error("Lý do yêu cầu bổ sung phải có từ 10 đến 1.000 ký tự.");
  }

  const successfulIds: number[] = [];
  const failures: BulkReviewFailure[] = [];
  for (let offset = 0; offset < eligible.length; offset += CONCURRENT_REVIEWS) {
    const batch = eligible.slice(offset, offset + CONCURRENT_REVIEWS);
    const results = await Promise.allSettled(
      batch.map((report) =>
        action === "receive"
          ? adminOccupationalAccidentReportApi.receive(report.id)
          : adminOccupationalAccidentReportApi.returnForSupplement(
              report.id,
              normalizedReason,
            ),
      ),
    );
    results.forEach((result, index) => {
      const report = batch[index];
      if (result.status === "fulfilled") {
        successfulIds.push(report.id);
      } else {
        failures.push({
          report,
          message: getErrorMessage(result.reason, "Không xử lý được báo cáo."),
        });
      }
    });
    onProgress(successfulIds.length + failures.length);
  }
  return { successfulIds, failures };
}
