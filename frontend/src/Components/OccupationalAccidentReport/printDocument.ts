import type {
  AccidentSummary,
  OccupationalAccidentOverview,
} from "@/services/occupationalAccidentReport";

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

// Wrap long amounts between groups of thousands without losing any digits.
export const printNumber = (value: number | string) =>
  new Intl.NumberFormat("vi-VN")
    .format(typeof value === "string" ? BigInt(value || "0") : value)
    .replaceAll(".", ".<wbr>");

export const printDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return escapeHtml(year && month && day ? `${day}/${month}/${year}` : value);
};

export const printToday = () =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

export interface PrintRow {
  name: string;
  code: string;
  metrics: AccidentSummary;
  strong?: boolean;
}

type MetricColumn = { key: keyof AccidentSummary; label: string };

const countColumns: MetricColumn[] = [
  { key: "totalCases", label: "Tổng số vụ" },
  { key: "fatalCases", label: "Số vụ có người chết" },
  { key: "multiVictimCases", label: "Số vụ có từ 2 người bị nạn trở lên" },
  { key: "victimCount", label: "Tổng số người bị nạn" },
  { key: "femaleCount", label: "Số lao động nữ bị nạn" },
  { key: "deathCount", label: "Số người chết" },
  { key: "severeCount", label: "Số người bị thương nặng" },
];

const unmanagedColumns: MetricColumn[] = [
  { key: "unmanagedVictimCount", label: "Tổng số người bị nạn" },
  { key: "unmanagedFemaleCount", label: "Số lao động nữ bị nạn" },
  { key: "unmanagedDeathCount", label: "Số người chết" },
  { key: "unmanagedSevereCount", label: "Số người bị thương nặng" },
];

const damageColumns: MetricColumn[] = [
  {
    key: "lostWorkDays",
    label: "Tổng số ngày nghỉ vì TNLĐ (kể cả ngày nghỉ chế độ)",
  },
  { key: "totalCostVnd", label: "Tổng chi phí (VND)" },
  { key: "propertyDamageVnd", label: "Thiệt hại tài sản (VND)" },
];

const expenseColumns: MetricColumn[] = [
  { key: "medicalCostVnd", label: "Chi phí y tế (VND)" },
  { key: "salaryCostVnd", label: "Trả lương trong thời gian điều trị (VND)" },
  { key: "compensationCostVnd", label: "Bồi thường, trợ cấp (VND)" },
];

export function printTable(
  title: string,
  headings: string[],
  rows: Array<{ cells: string[]; strong?: boolean }>,
  compact = false,
) {
  const metricWidth = 56 / (headings.length - 2);
  return `<table class="${compact ? "compact" : ""}">
    <caption>${escapeHtml(title)}</caption>
    <colgroup><col style="width:34%" /><col style="width:10%" />${headings
      .slice(2)
      .map(() => `<col style="width:${metricWidth}%" />`)
      .join("")}</colgroup>
    <thead>
      <tr>${headings.map((heading) => `<th scope="col">${escapeHtml(heading)}</th>`).join("")}</tr>
    </thead>
    <tbody>${
      rows.length
        ? rows
            .map(
              (row) =>
                `<tr${row.strong ? ' class="total-row"' : ""}>${row.cells
                  .map(
                    (cell, index) =>
                      `<td class="${index === 0 ? "label" : index === 1 ? "center code" : "number"}">${cell}</td>`,
                  )
                  .join("")}</tr>`,
            )
            .join("")
        : `<tr><td class="empty" colspan="${headings.length}">Không phát sinh số liệu.</td></tr>`
    }</tbody>
  </table>`;
}

const metricTable = (
  title: string,
  rows: PrintRow[],
  columns: MetricColumn[],
) =>
  printTable(
    title,
    [
      "Tên chỉ tiêu thống kê",
      "Mã số",
      ...columns.map((column) => column.label),
    ],
    rows.map((row) => ({
      strong: row.strong,
      cells: [
        escapeHtml(row.name),
        escapeHtml(row.code),
        ...columns.map((column) => printNumber(row.metrics[column.key])),
      ],
    })),
    columns.length > 4,
  );

export const summaryPrintRows = (
  overview: OccupationalAccidentOverview,
): PrintRow[] => [
  { name: "1. Tai nạn lao động", code: "", metrics: overview.regular },
  {
    name: "2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ",
    code: "10",
    metrics: overview.article39,
  },
  {
    name: "3. Tổng số (3 = 1 + 2)",
    code: "",
    metrics: overview.grandTotal,
    strong: true,
  },
];

export const countPrintTables = (
  title: string,
  rows: PrintRow[],
  closingContent = "",
) => {
  if (!rows.length) {
    return `<div class="closing-block"><p class="note">Không phát sinh số liệu.</p>${closingContent}</div>`;
  }
  const unmanagedTable = metricTable(
    `${title} - Người bị nạn không thuộc quyền quản lý của cơ sở`,
    rows,
    unmanagedColumns,
  );
  return (
    metricTable(`${title} - Số vụ và số người bị nạn`, rows, countColumns) +
    (closingContent
      ? `<div class="closing-block">${unmanagedTable}${closingContent}</div>`
      : unmanagedTable)
  );
};

export const damagePrintTables = (title: string, rows: PrintRow[]) =>
  rows.length
    ? metricTable(`${title} - Ngày nghỉ và thiệt hại`, rows, damageColumns) +
      metricTable(
        `${title} - Các khoản chi cụ thể của cơ sở`,
        rows,
        expenseColumns,
      )
    : "";

export const administrativeHeader = (agency: string) => `
  <header class="administrative-header">
    <div class="agency">${escapeHtml(agency)}</div>
    <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b>
      <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
    </div>
  </header>`;

export const printSignatures = (titles: string[]) => `
  <div class="signatures" style="grid-template-columns:repeat(${titles.length},1fr)">
    ${titles.map((title, index) => `<div><b>${escapeHtml(title)}</b><div class="signature-hint">(Ký, ghi rõ họ tên${index === titles.length - 1 ? " và đóng dấu" : ""})</div></div>`).join("")}
  </div>`;

interface PrintDocumentOptions {
  orientation?: "portrait" | "landscape";
  styles?: string;
}

export function openPrintDocument(
  title: string,
  body: string,
  options: PrintDocumentOptions = {},
) {
  const orientation = options.orientation ?? "portrait";
  const printWindow = window.open("", "_blank", "width=1100,height=900");
  if (!printWindow) throw new Error("Trình duyệt đang chặn cửa sổ in báo cáo.");
  printWindow.opener = null;
  const html = `<!doctype html><html lang="vi"><head>
    <meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: A4 ${orientation};
        margin: 20mm 15mm 20mm 30mm;
        @bottom-center { content: counter(page); font: 11pt "Times New Roman", Times, serif; }
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { color: #000; font: 13pt/1.4 "Times New Roman", Times, serif; }
      .document { overflow-wrap: anywhere; }
      .administrative-header { display: grid; grid-template-columns: 38% 62%; gap: 0; text-align: center; font-size: 11pt; margin-bottom: 8mm; }
      .agency { padding-right: 5mm; font-weight: bold; text-transform: uppercase; }
      .motto { font-weight: bold; margin-top: 1mm; }
      .motto::after { content: ""; display: block; width: 42mm; border-top: 1px solid; margin: 2mm auto 0; }
      h1 { font-size: 15pt; line-height: 1.35; text-align: center; margin: 0 0 2mm; }
      h2 { font-size: 13pt; margin: 7mm 0 3mm; break-after: avoid; page-break-after: avoid; }
      h3 { font-size: 12pt; margin: 5mm 0 2mm; break-after: avoid; page-break-after: avoid; }
      .subtitle { text-align: center; font-weight: bold; margin: 0 0 2mm; }
      .coverage { text-align: center; margin-bottom: 5mm; font-size: 12pt; }
      .info p { margin: 1.5mm 0; }
      .note { font-size: 11pt; font-style: italic; margin: 2mm 0 4mm; }
      .report-date { margin: 5mm 0 2mm; text-align: right; font-style: italic; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 5mm; font-size: 10.5pt; line-height: 1.3; break-inside: avoid; page-break-inside: avoid; }
      table.compact { font-size: 9.5pt; }
      caption { border: 0.2mm solid #000; border-bottom: 0; font-size: 11pt; font-weight: bold; text-align: left; padding: 2mm 1.5mm; break-after: avoid; page-break-after: avoid; }
      thead { display: table-header-group; break-inside: avoid; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th, td { border: 0.2mm solid #000; padding: 1.5mm 1mm; vertical-align: middle; overflow-wrap: anywhere; }
      th { text-align: center; font-weight: bold; }
      .label { text-align: left; }
      .number { text-align: right; font-variant-numeric: tabular-nums; }
      .center { text-align: center; }
      .code { font-size: 9.5pt; }
      .total-row td { font-weight: bold; }
      .empty { text-align: center; font-style: italic; }
      .signatures { display: grid; gap: 5mm; text-align: center; min-height: 40mm; margin-top: 5mm; font-size: 11pt; break-inside: avoid; page-break-inside: avoid; }
      .signature-hint { font-size: 10pt; font-style: italic; margin-top: 1mm; }
      .closing-block { break-inside: avoid; page-break-inside: avoid; }
      @media screen {
        body { background: #e5e5e5; }
        .document { width: ${orientation === "landscape" ? 297 : 210}mm; margin: 8mm auto; padding: 20mm 15mm 20mm 30mm; background: white; box-shadow: 0 1mm 5mm #0002; }
      }
      ${options.styles ?? ""}
    </style></head><body><main class="document">${body}</main></body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for the document and fonts to lay out before opening the print dialog.
  void printWindow.document.fonts.ready.then(() => {
    if (printWindow.closed) return;
    printWindow.requestAnimationFrame(() => {
      if (printWindow.closed) return;
      printWindow.focus();
      printWindow.print();
    });
  });
}
