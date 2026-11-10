import type {
  AccidentCause,
  OccupationalAccidentOverview,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { getOccupationalAccidentCoverage } from "@/services/occupationalAccidentReport";
import { getReportPeriodLabel } from "@/services/reportPeriod";
import {
  administrativeHeader,
  escapeHtml,
  openPrintDocument,
  printDate,
  printNumber,
  printSignatures,
  printToday,
} from "./printDocument";
import {
  overviewPrintTable,
  overviewDamagePrintTable,
  ENTERPRISE_OVERVIEW_PRINT_STYLES,
} from "./overviewPrint";

export function printOccupationalAccidentReport(
  report: OccupationalAccidentReport,
  overview: OccupationalAccidentOverview,
  causes: readonly AccidentCause[] = [],
) {
  const coverage = getOccupationalAccidentCoverage(
    report.reportPeriod.reportYear,
    report.reportPeriod.periodCode,
  );
  const periodLabel = `${getReportPeriodLabel(report.reportPeriod.periodCode)} ${report.reportPeriod.reportYear}`;

  openPrintDocument(
    `${report.reportPeriod.reportName} - ${report.enterprise.taxCode}`,
    `${administrativeHeader(report.enterprise.enterpriseName)}
      <h1>BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG</h1>
      <div class="subtitle">${escapeHtml(periodLabel)}</div>
      <div class="coverage">Thời gian thống kê: ${printDate(coverage.startDate)} - ${printDate(coverage.endDate)}</div>
      <section class="enterprise-info">
        <p><b>Tên doanh nghiệp:</b> ${escapeHtml(report.enterprise.enterpriseName)}</p>
        <p><b>Mã số thuế:</b> ${escapeHtml(report.enterprise.taxCode)}</p>
        <p class="wide"><b>Địa chỉ:</b> ${escapeHtml(report.enterprise.address)}</p>
        <p><b>Loại hình cơ sở:</b> ${escapeHtml(report.enterprise.businessTypeName)} (Mã: ${escapeHtml(report.enterprise.businessTypeCode)})</p>
        <p><b>Ngành nghề kinh doanh:</b> ${escapeHtml(report.enterprise.industryName)} (Mã: ${escapeHtml(report.enterprise.industryCode)})</p>
        <p><b>Tổng số lao động:</b> ${printNumber(report.totalEmployees)} người; <b>Trong đó nữ:</b> ${printNumber(report.femaleEmployees)} người.</p>
        <p><b>Tổng quỹ lương trong kỳ:</b> ${printNumber(report.payrollFundVnd)} VND.</p>
        ${report.noAccidentsDeclared ? '<p class="wide"><b>Doanh nghiệp không phát sinh tai nạn lao động trong kỳ báo cáo.</b></p>' : ""}
      </section>
      ${overviewPrintTable(overview, report, causes)}
      <section class="enterprise-ending">
        <h2>II. Thiệt hại do tai nạn lao động</h2>
        ${overviewDamagePrintTable(overview.grandTotal)}
        <p class="report-date">Ngày lập bản in: ${printToday()}</p>
        ${printSignatures(["NGƯỜI LẬP BÁO CÁO", "ĐẠI DIỆN DOANH NGHIỆP"])}
      </section>`,
    { orientation: "landscape", styles: ENTERPRISE_OVERVIEW_PRINT_STYLES },
  );
}
