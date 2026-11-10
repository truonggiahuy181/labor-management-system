import type {
  AccidentSummary,
  AdminOccupationalAccidentSummary,
} from "@/services/occupationalAccidentReport";
import { escapeHtml } from "@/Components/OccupationalAccidentReport/printDocument";
import {
  CLASSIFICATION_COLUMN_WIDTHS,
  CLASSIFICATION_HEADER_ROWS,
  CLASSIFICATION_METRIC_KEYS,
  UNMANAGED_HEADER_LABELS,
  UNMANAGED_METRIC_KEYS,
  formatClassificationValue,
  getClassificationGroups,
  getClassificationTotals,
  type ClassificationGroup,
} from "./summaryClassification";

// Bound merged cells in long lists so the group label repeats on continuation pages.
const printGroups = (
  summary: AdminOccupationalAccidentSummary,
): ClassificationGroup[] =>
  getClassificationGroups(summary).flatMap((group) => {
    if (group.rows.length <= 9) return [group];
    const chunks: ClassificationGroup[] = [];
    for (let index = 0; index < group.rows.length; index += 6) {
      chunks.push({
        ...group,
        key: `${group.key}-${index}`,
        label: `${group.label}${index ? " (tiếp)" : ""}`,
        rows: group.rows.slice(index, index + 6),
      });
    }
    return chunks;
  });

const metricCells = (
  row: AccidentSummary,
  keys: ReadonlyArray<keyof AccidentSummary>,
) =>
  keys
    .map(
      (key) =>
        `<td class="number">${escapeHtml(formatClassificationValue(row, key)).replaceAll(".", ".<wbr>")}</td>`,
    )
    .join("");

function tableBody(
  summary: AdminOccupationalAccidentSummary,
  keys: ReadonlyArray<keyof AccidentSummary>,
) {
  return `<tbody>${getClassificationTotals(summary)
    .map(
      (row) => `
    <tr${row.strong ? ' class="total-row"' : ""}><th colspan="2" scope="row">${escapeHtml(row.label)}</th><td></td>${metricCells(row.value, keys)}</tr>`,
    )
    .join("")}</tbody>
    ${printGroups(summary)
      .map(
        (group) =>
          `<tbody class="classification-group">${
            group.rows.length
              ? group.rows
                  .map(
                    (row, index) =>
                      `<tr>${index === 0 ? `<th class="group-label" scope="rowgroup" rowspan="${group.rows.length}">${escapeHtml(group.label)}</th>` : ""}<td>${escapeHtml(row.name)}</td><td class="center code">${escapeHtml(row.code)}</td>${metricCells(row, keys)}</tr>`,
                  )
                  .join("")
              : `<tr><th class="group-label" scope="rowgroup">${escapeHtml(group.label)}</th><td colspan="${keys.length + 2}" class="empty">Không phát sinh số liệu.</td></tr>`
          }</tbody>`,
      )
      .join("")}`;
}

export function classificationPrintTable(
  summary: AdminOccupationalAccidentSummary,
) {
  return `<table class="classification-table" data-report-table="classification">
    <colgroup>${CLASSIFICATION_COLUMN_WIDTHS.map((width) => `<col style="width:${width}%" />`).join("")}</colgroup>
    <thead>${CLASSIFICATION_HEADER_ROWS.map((row) => `<tr>${row.map((cell) => `<th${cell.rowSpan ? ` rowspan="${cell.rowSpan}"` : ""}${cell.colSpan ? ` colspan="${cell.colSpan}"` : ""} scope="col">${escapeHtml(cell.label)}</th>`).join("")}</tr>`).join("")}</thead>
    ${tableBody(summary, CLASSIFICATION_METRIC_KEYS)}
  </table>`;
}

export function unmanagedClassificationPrintTable(
  summary: AdminOccupationalAccidentSummary,
) {
  return `<table class="classification-table unmanaged-table" data-report-table="unmanaged">
    <colgroup>${[10, 28, 6, 14, 14, 14, 14].map((width) => `<col style="width:${width}%" />`).join("")}</colgroup>
    <thead><tr>${UNMANAGED_HEADER_LABELS.map((label) => `<th scope="col">${escapeHtml(label)}</th>`).join("")}</tr></thead>
    ${tableBody(summary, UNMANAGED_METRIC_KEYS)}
  </table>`;
}

export const SUMMARY_CLASSIFICATION_PRINT_STYLES = `
  .document > table:not(.classification-table) { font-size: 9.5pt; }
  .document > table:not(.classification-table) th, .document > table:not(.classification-table) td { padding: .8mm 1mm; }
  .summary-classification { break-before: page; page-break-before: always; }
  .summary-classification h2 { margin: 0 0 2mm; line-height: 1.2; }
  .summary-classification > .report-scope { font-size: 9pt; line-height: 1.2; margin: 0 0 2mm; }
  .summary-classification table { margin: 1mm 0 2mm; }
  table.classification-table { font-size: 8.5pt; line-height: 1.25; break-inside: auto; page-break-inside: auto; }
  .classification-table th, .classification-table td { padding: 1mm .65mm; border: .2mm solid #9ca3af; }
  .classification-table thead th { background: #f3f5f7; font-size: 8pt; font-weight: 600; padding: .7mm .35mm; overflow-wrap: normal; }
  .classification-table tbody th { text-align: left; font-weight: 400; }
  .classification-table .group-label { font-weight: bold; vertical-align: top; }
  .classification-table .code { font-size: 8pt; }
  .classification-table .total-row { background: #f3f5f7; }
  .classification-table .total-row th, .classification-table .total-row td { font-weight: bold; }
  .classification-group { border-top: .35mm solid #6b7280; }
  table.unmanaged-table { font-size: 10.5pt; }
  .unmanaged-table thead th { font-size: 10pt; }
  @media print {
    .classification-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
