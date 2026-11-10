import type {
  AccidentCause,
  AccidentSummary,
  OccupationalAccidentOverview,
  OccupationalAccidentReport,
} from "@/services/occupationalAccidentReport";
import {
  OVERVIEW_COLUMN_WIDTHS,
  OVERVIEW_HEADER_ROWS,
  OVERVIEW_METRIC_KEYS,
  DAMAGE_COLUMN_WIDTHS,
  DAMAGE_HEADER_ROWS,
  DAMAGE_METRIC_KEYS,
  buildOverviewRows,
  type OverviewHeading,
} from "./overviewLayout";
import { escapeHtml, printNumber } from "./printDocument";

const colgroup = (widths: readonly number[]) =>
  `<colgroup>${widths.map((width) => `<col style="width:${width}%" />`).join("")}</colgroup>`;
const thead = (rows: OverviewHeading[][]) =>
  `<thead>${rows.map((row) => `<tr>${row.map((cell) => `<th${cell.rowSpan ? ` rowspan="${cell.rowSpan}"` : ""}${cell.colSpan ? ` colspan="${cell.colSpan}"` : ""}>${escapeHtml(cell.label).replaceAll("\n", "<br />")}</th>`).join("")}</tr>`).join("")}</thead>`;

export function overviewPrintTable(
  overview: OccupationalAccidentOverview,
  report: OccupationalAccidentReport,
  causes: readonly AccidentCause[] = [],
) {
  return `<table class="enterprise-overview" data-report-table="overview">
    ${colgroup(OVERVIEW_COLUMN_WIDTHS)}${thead(OVERVIEW_HEADER_ROWS)}
    <tbody>${buildOverviewRows(overview, report, causes)
      .map((row) => {
        if (row.kind !== "metrics")
          return `<tr class="${row.kind}-row"><th colspan="13">${escapeHtml(row.title)}</th></tr>`;
        return `<tr${row.strong ? ' class="total-row"' : ""}><td>${escapeHtml(row.title)}</td><td class="center code">${escapeHtml(row.code)}</td>${OVERVIEW_METRIC_KEYS.map((key) => `<td class="number">${printNumber(row.metrics[key])}</td>`).join("")}</tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

export const overviewDamagePrintTable = (
  summary: AccidentSummary,
) => `<table class="enterprise-damage" data-report-table="damage">
  ${colgroup(DAMAGE_COLUMN_WIDTHS)}${thead(DAMAGE_HEADER_ROWS)}
  <tbody><tr>${DAMAGE_METRIC_KEYS.map((key) => `<td class="${key === "lostWorkDays" ? "center" : "number"}">${printNumber(summary[key])}</td>`).join("")}</tr></tbody>
</table>`;

export const ENTERPRISE_OVERVIEW_PRINT_STYLES = `
  .administrative-header { margin-bottom: 2mm; }
  h1 { font-size: 14pt; margin-bottom: 1mm; }
  .subtitle { margin-bottom: 1mm; }
  .coverage { font-size: 11pt; margin-bottom: 2mm; }
  .enterprise-info { display: grid; grid-template-columns: 1fr 1fr; gap: .5mm 5mm; margin-bottom: 2mm; font-size: 11pt; line-height: 1.3; }
  .enterprise-info p { margin: 0; }
  .enterprise-info .wide { grid-column: 1 / -1; }
  table.enterprise-overview { margin: 2mm 0 3mm; font-size: 9pt; line-height: 1.2; break-inside: auto; page-break-inside: auto; }
  .enterprise-overview th, .enterprise-overview td { padding: .55mm .65mm; }
  .enterprise-overview thead th { background: #f3f5f7; font-size: 8pt; font-weight: 600; overflow-wrap: normal; }
  .enterprise-overview .section-row th, .enterprise-overview .group-row th { text-align: left; break-after: avoid; }
  .enterprise-overview .section-row { break-after: avoid; page-break-after: avoid; }
  .enterprise-overview .group-row { break-after: avoid; page-break-after: avoid; }
  .enterprise-overview .section-row th { font-weight: bold; }
  .enterprise-overview .group-row th { font-weight: normal; padding-left: 2mm; }
  .enterprise-overview .code { font-size: 8pt; }
  .enterprise-overview .total-row td { font-weight: bold; }
  .enterprise-ending { break-inside: avoid; page-break-inside: avoid; }
  .enterprise-ending h2 { font-size: 11pt; line-height: 1.2; margin: 2mm 0 1mm; }
  table.enterprise-damage { font-size: 9.5pt; margin: 0; line-height: 1.25; }
  .enterprise-damage th, .enterprise-damage td { padding: .8mm 1mm; }
  .enterprise-damage thead th { background: #f3f5f7; font-weight: 600; }
  .enterprise-ending .report-date { font-size: 11pt; line-height: 1.2; margin: 3mm 0 1mm; }
  .enterprise-ending .signatures { min-height: 20mm; margin-top: 2mm; }
  @media print { .enterprise-overview th, .enterprise-damage th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;
