import type {
  AccidentBreakdownRow,
  AccidentSummary,
  OccupationalAccidentOverview,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import { getOccupationalAccidentCoverage } from "@/services/occupationalAccidentReport";

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

const summaryRows: Array<[string, keyof AccidentSummary, boolean]> = [
  ["Tổng số vụ", "totalCases", false],
  ["Số vụ có người chết", "fatalCases", false],
  ["Số vụ có từ 2 người bị nạn", "multiVictimCases", false],
  ["Tổng số người bị nạn", "victimCount", false],
  ["Số lao động nữ bị nạn", "femaleCount", false],
  ["Số người chết", "deathCount", false],
  ["Số người bị thương nặng", "severeCount", false],
  ["Tổng chi phí (VND)", "totalCostVnd", true],
  ["Tổng ngày nghỉ", "lostWorkDays", false],
  ["Thiệt hại tài sản (VND)", "propertyDamageVnd", true],
];

const summaryTable = (overview: OccupationalAccidentOverview) => `
  <table>
    <thead><tr><th>Chỉ tiêu</th><th>TNLĐ</th><th>Khoản 2 Điều 39</th><th>Tổng cộng</th></tr></thead>
    <tbody>${summaryRows
      .map(
        ([label, key, isMoney]) => `<tr>
          <td>${escapeHtml(label)}</td>
          ${[overview.regular, overview.article39, overview.grandTotal]
            .map(
              (row) =>
                `<td class="number">${isMoney ? money(String(row[key])) : escapeHtml(row[key])}</td>`,
            )
            .join("")}
        </tr>`,
      )
      .join("")}</tbody>
  </table>`;

const breakdownTable = (title: string, rows: AccidentBreakdownRow[]) => `
  <h3>${escapeHtml(title)}</h3>
  <table>
    <thead><tr><th>Mã</th><th>Tên</th><th>Số vụ</th><th>Nạn nhân</th><th>Nữ</th><th>Chết</th><th>Thương nặng</th></tr></thead>
    <tbody>${
      rows.length
        ? rows
            .map(
              (row) => `<tr>
      <td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td>
      <td class="number">${row.totalCases}</td><td class="number">${row.victimCount}</td>
      <td class="number">${row.femaleCount}</td><td class="number">${row.deathCount}</td>
      <td class="number">${row.severeCount}</td>
    </tr>`,
            )
            .join("")
        : '<tr><td colspan="7" class="center">Không có dữ liệu</td></tr>'
    }</tbody>
  </table>`;

const casesTable = (report: OccupationalAccidentReport) => `
  <h2>I. Chi tiết các vụ tai nạn lao động</h2>
  ${
    report.cases.length
      ? report.cases
          .map(
            (item, index) => `
    <section class="case">
      <h3>Vụ tai nạn số ${index + 1} – ngày ${date(item.accidentDate)}</h3>
      <p><b>Nguyên nhân:</b> ${escapeHtml(item.accidentCause.code)} - ${escapeHtml(item.accidentCause.name)}</p>
      <p><b>Yếu tố gây chấn thương:</b> ${escapeHtml(item.injuryFactor.code)} - ${escapeHtml(item.injuryFactor.name)}</p>
      <table><thead><tr><th>Nghề nghiệp</th><th>Phạm vi quản lý</th><th>Nạn nhân</th><th>Nữ</th><th>Chết</th><th>Thương nặng</th></tr></thead>
      <tbody>${item.victimGroups
        .map(
          (group) => `<tr>
        <td>${escapeHtml(group.occupation.code)} - ${escapeHtml(group.occupation.name)}</td>
        <td>${group.isUnderEnterpriseManagement ? "Doanh nghiệp" : "Ngoài doanh nghiệp"}</td>
        <td class="number">${group.victimCount}</td><td class="number">${group.femaleCount}</td>
        <td class="number">${group.deathCount}</td><td class="number">${group.severeCount}</td>
      </tr>`,
        )
        .join("")}</tbody></table>
      <p><b>Thiệt hại:</b> Y tế ${money(item.medicalCostVnd)} VND; lương điều trị ${money(item.salaryCostVnd)} VND;
      bồi thường ${money(item.compensationCostVnd)} VND; nghỉ ${item.lostWorkDays} ngày; tài sản ${money(item.propertyDamageVnd)} VND.</p>
    </section>`,
          )
          .join("")
      : "<p>Không phát sinh vụ tai nạn lao động thuộc phạm vi quản lý.</p>"
  }`;

export function printOccupationalAccidentReport(
  report: OccupationalAccidentReport,
  overview: OccupationalAccidentOverview,
) {
  const printWindow = window.open("", "_blank", "width=1280,height=900");
  if (!printWindow) {
    throw new Error("Trình duyệt đang chặn cửa sổ in báo cáo.");
  }
  printWindow.opener = null;
  const coverage = getOccupationalAccidentCoverage(
    report.reportPeriod.reportYear,
    report.reportPeriod.periodCode,
  );
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
    <title>${escapeHtml(report.reportPeriod.reportName)} - ${escapeHtml(report.enterprise.taxCode)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; } body { font: 12px Arial, sans-serif; color: #111; margin: 0; }
      h1 { text-align: center; font-size: 19px; margin: 0 0 6px; } h2 { font-size: 15px; margin: 18px 0 8px; }
      h3 { font-size: 13px; margin: 12px 0 6px; } p { margin: 5px 0; line-height: 1.4; }
      .subtitle, .center { text-align: center; } .info { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; margin: 16px 0; }
      table { width: 100%; border-collapse: collapse; margin: 7px 0 14px; page-break-inside: auto; }
      th, td { border: 1px solid #777; padding: 5px; vertical-align: top; } th { background: #eee; text-align: center; }
      tr { page-break-inside: avoid; } .number { text-align: right; } .case { page-break-inside: avoid; }
      .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; text-align: center; margin-top: 28px; min-height: 110px; }
      .muted { color: #555; font-style: italic; }
    </style></head><body>
    <h1>BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG</h1>
    <div class="subtitle"><b>${escapeHtml(report.reportPeriod.reportPeriod)} năm ${report.reportPeriod.reportYear}</b><br />
      Thời gian thống kê: ${date(coverage.startDate)} – ${date(coverage.endDate)}</div>
    <div class="info">
      <div><b>Doanh nghiệp:</b> ${escapeHtml(report.enterprise.enterpriseName)}</div>
      <div><b>Mã số thuế:</b> ${escapeHtml(report.enterprise.taxCode)}</div>
      <div><b>Loại hình:</b> ${escapeHtml(report.enterprise.businessTypeName)}</div>
      <div><b>Ngành nghề:</b> ${escapeHtml(report.enterprise.industryName)}</div>
      <div><b>Địa chỉ:</b> ${escapeHtml(report.enterprise.address)}</div>
      <div><b>Lao động:</b> ${report.totalEmployees} người (${report.femaleEmployees} nữ); <b>Quỹ lương:</b> ${money(report.payrollFundVnd)} VND</div>
    </div>
    ${casesTable(report)}
    <h2>II. Số liệu tổng hợp</h2>${summaryTable(overview)}
    ${breakdownTable("1. Phân theo nguyên nhân xảy ra tai nạn", overview.byCause)}
    ${breakdownTable("2. Phân theo yếu tố gây chấn thương", overview.byInjuryFactor)}
    ${breakdownTable("3. Phân theo nghề nghiệp", overview.byOccupation)}
    <div class="signatures"><div><b>NGƯỜI LẬP BÁO CÁO</b><p class="muted">(Ký, ghi rõ họ tên)</p></div>
      <div><b>ĐẠI DIỆN DOANH NGHIỆP</b><p class="muted">(Ký, ghi rõ họ tên và đóng dấu)</p></div></div>
    <script>window.addEventListener('load', () => { window.focus(); window.print(); });<\/script>
  </body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
