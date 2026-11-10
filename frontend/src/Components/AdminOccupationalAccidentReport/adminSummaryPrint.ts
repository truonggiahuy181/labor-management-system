import type {
  AdminOccupationalAccidentSummary,
  OccupationalAccidentBusinessTypeSummary,
} from "@/services/occupationalAccidentReport";
import {
  administrativeHeader,
  countPrintTables,
  escapeHtml,
  openPrintDocument,
  printNumber,
  printSignatures,
  printTable,
  printToday,
} from "@/Components/OccupationalAccidentReport/printDocument";
import {
  classificationPrintTable,
  SUMMARY_CLASSIFICATION_PRINT_STYLES,
  unmanagedClassificationPrintTable,
} from "./summaryClassificationPrint";

const frequency = (value: number, employees: number) =>
  employees > 0
    ? new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format((value * 1_000) / employees)
    : "0,00";

const generalTables = (summary: AdminOccupationalAccidentSummary) => {
  const total: OccupationalAccidentBusinessTypeSummary = {
    code: "",
    name: "Tổng số",
    totalEnterpriseCount: summary.registeredEnterpriseCount,
    enterpriseCount: summary.enterpriseCount,
    totalEmployees: summary.totalEmployees,
    femaleEmployees: summary.femaleEmployees,
    payrollFundVnd: summary.payrollFundVnd,
    accidentSummary: summary.overview.grandTotal,
  };
  const rows = [total, ...summary.byBusinessType];
  const table = (
    title: string,
    headings: string[],
    cells: (row: OccupationalAccidentBusinessTypeSummary) => string[],
  ) =>
    printTable(
      title,
      ["Loại hình cơ sở", "Mã số", ...headings],
      rows.map((row, index) => ({
        strong: index === 0,
        cells: [escapeHtml(row.name), escapeHtml(row.code), ...cells(row)],
      })),
    );

  return (
    table(
      "1. Cơ sở tham gia báo cáo",
      ["Tổng số cơ sở", "Số cơ sở tham gia báo cáo"],
      (row) => [
        printNumber(row.totalEnterpriseCount),
        printNumber(row.enterpriseCount),
      ],
    ) +
    table(
      "2. Lực lượng lao động của cơ sở tham gia báo cáo",
      ["Số lao động", "Trong đó: lao động nữ", "Tổng quỹ lương (VND)"],
      (row) => [
        printNumber(row.totalEmployees),
        printNumber(row.femaleEmployees),
        printNumber(row.payrollFundVnd),
      ],
    ) +
    table(
      "3. Tình hình tai nạn lao động",
      ["Tổng số người bị nạn", "Số người chết", "Số người bị thương nặng"],
      (row) => [
        printNumber(row.accidentSummary.victimCount),
        printNumber(row.accidentSummary.deathCount),
        printNumber(row.accidentSummary.severeCount),
      ],
    ) +
    table(
      "4. Tần suất tai nạn lao động",
      ["K TNLĐ (‰)", "K chết (‰)"],
      (row) => [
        frequency(row.accidentSummary.victimCount, row.totalEmployees),
        frequency(row.accidentSummary.deathCount, row.totalEmployees),
      ],
    )
  );
};

export function printAdminOccupationalAccidentSummary(
  summary: AdminOccupationalAccidentSummary,
  scopeLabel: string,
) {
  const closingContent = `<p class="report-date">Ngày lập bản in: ${printToday()}</p>
    ${printSignatures(["NGƯỜI LẬP BIỂU", "TRƯỞNG BỘ PHẬN", "THỦ TRƯỞNG CƠ QUAN"])}`;

  openPrintDocument(
    `Báo cáo tổng hợp tai nạn lao động - ${scopeLabel}`,
    `${administrativeHeader("Cơ quan quản lý nhà nước về lao động")}
      <h1>BÁO CÁO TỔNG HỢP<br />TÌNH HÌNH TAI NẠN LAO ĐỘNG</h1>
      <div class="subtitle">${escapeHtml(scopeLabel)}</div>
      <section class="info">
        <p><b>Phạm vi số liệu:</b> ${escapeHtml(scopeLabel)}.</p>
        <p><b>Số báo cáo đã tiếp nhận:</b> ${printNumber(summary.reportCount)}.</p>
        <p><b>Số cơ sở tham gia báo cáo:</b> ${printNumber(summary.enterpriseCount)}.</p>
      </section>
      <h2>I. THÔNG TIN TỔNG QUAN</h2>
      ${generalTables(summary)}
      <section class="summary-classification">
        <h2>II. PHÂN LOẠI TNLĐ</h2>
        <p class="report-scope">Phạm vi: ${escapeHtml(scopeLabel)}.</p>
        ${classificationPrintTable(summary)}
      </section>
      <h2>III. NGƯỜI BỊ NẠN KHÔNG THUỘC QUYỀN QUẢN LÝ CỦA CƠ SỞ</h2>
      ${unmanagedClassificationPrintTable(summary)}
      <h2>IV. PHÂN THEO NGHỀ NGHIỆP</h2>
      ${countPrintTables(
        "Phân theo nghề nghiệp",
        summary.overview.byOccupation.map((row) => ({
          name: row.name,
          code: row.code,
          metrics: row,
        })),
        closingContent,
      )}`,
    { orientation: "landscape", styles: SUMMARY_CLASSIFICATION_PRINT_STYLES },
  );
}
