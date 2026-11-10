import type {
  AccidentBreakdownRow,
  AccidentCountMetrics,
  AccidentSummary,
  OccupationalAccidentOverview,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { getOccupationalAccidentCoverage } from "@/services/occupationalAccidentReport";
import { getReportPeriodLabel } from "@/services/reportPeriod";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const date = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const money = (value: string) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || "0"));

const METRIC_KEYS: Array<keyof AccidentCountMetrics> = [
  "totalCases",
  "fatalCases",
  "multiVictimCases",
  "victimCount",
  "unmanagedVictimCount",
  "femaleCount",
  "unmanagedFemaleCount",
  "deathCount",
  "unmanagedDeathCount",
  "severeCount",
  "unmanagedSevereCount",
];

const metricCells = (metrics: AccidentCountMetrics) =>
  METRIC_KEYS.map((key) => `<td class="number">${metrics[key]}</td>`).join("");

const summaryRow = (
  title: string,
  code: string,
  summary: AccidentSummary,
  strong = false,
) => `
  <tr class="${strong ? "strong" : ""}">
    <td>${escapeHtml(title)}</td><td class="center">${escapeHtml(code)}</td>${metricCells(summary)}
  </tr>`;

const breakdownRow = (row: AccidentBreakdownRow, code = row.code) => `
  <tr><td class="indent">${escapeHtml(row.name)}</td><td class="center">${escapeHtml(code)}</td>${metricCells(row)}</tr>`;

const sectionRow = (title: string) =>
  `<tr class="section"><td colspan="13">${escapeHtml(title)}</td></tr>`;

const overviewTable = (overview: OccupationalAccidentOverview) => {
  const employerCauses = overview.byCause.filter(
    (row) => Number(row.code) <= 6,
  );
  const employeeCauses = overview.byCause.filter((row) => Number(row.code) > 6);
  const factorStart = 101;
  const occupationStart = factorStart + overview.byInjuryFactor.length;

  return `
    <table class="overview">
      <thead>
        <tr><th rowspan="4" class="indicator">Tên chỉ tiêu thống kê</th><th rowspan="4">Mã số</th><th colspan="11">Phân loại TNLĐ theo mức độ thương tật</th></tr>
        <tr><th colspan="3">Số vụ (Vụ)</th><th colspan="8">Số người bị nạn (Người)</th></tr>
        <tr>
          <th rowspan="2">Tổng số</th><th rowspan="2">Số vụ có người chết</th><th rowspan="2">Số vụ có từ 2 người bị nạn trở lên</th>
          <th colspan="2">Tổng số</th><th colspan="2">Số lao động nữ</th><th colspan="2">Số người bị chết</th><th colspan="2">Số người bị thương nặng</th>
        </tr>
        <tr>${Array.from({ length: 4 })
          .map(() => "<th>Tổng số</th><th>Không thuộc quyền quản lý</th>")
          .join("")}</tr>
      </thead>
      <tbody>
        ${summaryRow("1. Tai nạn lao động", "", overview.regular, true)}
        ${sectionRow("1.1 Phân theo nguyên nhân xảy ra TNLĐ")}
        ${sectionRow("a. Do người sử dụng lao động")}
        ${employerCauses.map((row) => breakdownRow(row)).join("")}
        ${sectionRow("b. Do người lao động")}
        ${employeeCauses.map((row) => breakdownRow(row)).join("")}
        ${sectionRow("1.2 Phân theo yếu tố gây chấn thương")}
        ${overview.byInjuryFactor.map((row, index) => breakdownRow(row, String(factorStart + index))).join("")}
        ${sectionRow("1.3 Phân theo nghề nghiệp")}
        ${overview.byOccupation.map((row, index) => breakdownRow(row, String(occupationStart + index))).join("")}
        ${summaryRow("2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ", "10", overview.article39)}
        ${summaryRow("3. Tổng số (3=1+2)", "", overview.grandTotal, true)}
      </tbody>
    </table>`;
};

const damageTable = (summary: AccidentSummary) => `
  <h2>II. Thiệt hại do tai nạn lao động</h2>
  <table>
    <thead>
      <tr><th rowspan="3">Tổng số ngày nghỉ vì tai nạn lao động<br />(Kể cả ngày nghỉ chế độ)</th><th colspan="4">Thiệt hại do TNLĐ (VND)</th><th rowspan="3">Thiệt hại tài sản<br />(VND)</th></tr>
      <tr><th rowspan="2">Tổng số</th><th colspan="3">Khoản chi cụ thể của cơ sở</th></tr>
      <tr><th>Y tế</th><th>Trả lương trong thời gian điều trị</th><th>Bồi thường, trợ cấp</th></tr>
    </thead>
    <tbody><tr>
      <td class="center">${summary.lostWorkDays}</td><td class="number">${money(summary.totalCostVnd)}</td>
      <td class="number">${money(summary.medicalCostVnd)}</td><td class="number">${money(summary.salaryCostVnd)}</td>
      <td class="number">${money(summary.compensationCostVnd)}</td><td class="number">${money(summary.propertyDamageVnd)}</td>
    </tr></tbody>
  </table>`;

export function printOccupationalAccidentReport(
  report: OccupationalAccidentReport,
  overview: OccupationalAccidentOverview,
) {
  const printWindow = window.open("", "_blank", "width=1400,height=900");
  if (!printWindow) throw new Error("Trình duyệt đang chặn cửa sổ in báo cáo.");
  printWindow.opener = null;
  const coverage = getOccupationalAccidentCoverage(
    report.reportPeriod.reportYear,
    report.reportPeriod.periodCode,
  );
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
    <title>${escapeHtml(report.reportPeriod.reportName)} - ${escapeHtml(report.enterprise.taxCode)}</title>
    <style>
      @page { size: A3 landscape; margin: 9mm; }
      * { box-sizing: border-box; } body { font: 10px Arial, sans-serif; color: #111; margin: 0; }
      h1 { text-align: center; font-size: 17px; margin: 0 0 5px; } h2 { font-size: 13px; margin: 14px 0 6px; }
      .subtitle, .center { text-align: center; } .info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 18px; margin: 12px 0; }
      table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; page-break-inside: auto; }
      th, td { border: 1px solid #8c96a3; padding: 4px; vertical-align: middle; } th { background: #f1f4f7; text-align: center; font-weight: 600; }
      .overview { table-layout: fixed; font-size: 8px; } .overview .indicator { width: 31%; } .overview th:not(.indicator), .overview td:not(:first-child) { width: 5.3%; }
      tr { page-break-inside: avoid; } .number { text-align: right; } .indent { padding-left: 10px; }
      .section td { font-weight: 700; background: #fafafa; } .strong td { font-weight: 700; background: #eef5ff; }
      .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; text-align: center; margin-top: 22px; min-height: 90px; }
      .muted { color: #555; font-style: italic; }
    </style></head><body>
    <h1>BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG</h1>
    <div class="subtitle"><b>${escapeHtml(getReportPeriodLabel(report.reportPeriod.periodCode))} năm ${report.reportPeriod.reportYear}</b><br />
      Thời gian thống kê: ${date(coverage.startDate)} – ${date(coverage.endDate)}</div>
    <div class="info">
      <div><b>Doanh nghiệp:</b> ${escapeHtml(report.enterprise.enterpriseName)}</div>
      <div><b>Mã số thuế:</b> ${escapeHtml(report.enterprise.taxCode)}</div>
      <div><b>Loại hình:</b> ${escapeHtml(report.enterprise.businessTypeName)}</div>
      <div><b>Ngành nghề:</b> ${escapeHtml(report.enterprise.industryName)}</div>
      <div><b>Lao động:</b> ${report.totalEmployees} người (${report.femaleEmployees} nữ)</div>
      <div><b>Quỹ lương:</b> ${money(report.payrollFundVnd)} VND</div>
    </div>
    ${overviewTable(overview)}
    ${damageTable(overview.grandTotal)}
    <div class="signatures"><div><b>NGƯỜI LẬP BÁO CÁO</b><p class="muted">(Ký, ghi rõ họ tên)</p></div>
      <div><b>ĐẠI DIỆN DOANH NGHIỆP</b><p class="muted">(Ký, ghi rõ họ tên và đóng dấu)</p></div></div>
    <script>window.addEventListener('load', () => { window.focus(); window.print(); });<\/script>
  </body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
