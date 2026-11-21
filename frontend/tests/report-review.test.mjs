import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "../node_modules/typescript/lib/typescript.js";

const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const flagUrl = moduleUrl(
  compile(
    await readFile(
      new URL("../src/constants/reportReviewFlags.ts", import.meta.url),
      "utf8",
    ),
  ),
);
const {
  getReviewReasonDraft,
  combineReviewReason,
  isValidReviewReason,
  REPORT_REVIEW_FLAGS,
} = await import(flagUrl);
const report = (id, reviewFlags, status = "SUBMITTED") => ({
  id,
  reviewFlags,
  status,
  enterpriseName: `Doanh nghiệp ${id}`,
  version: id + 10,
});

test("uses the filtered flag for the common reason and retains every additional issue", () => {
  const reports = [
    report(1, ["MISSING_SIGNATURE", "MISSING_WORKFORCE"]),
    report(2, ["MISSING_WORKFORCE"]),
  ];
  const draft = getReviewReasonDraft(reports, "MISSING_WORKFORCE");
  assert.equal(draft.reason, REPORT_REVIEW_FLAGS[0].reason);
  assert.equal(draft.additionalReasons[1], REPORT_REVIEW_FLAGS[1].reason);
  assert.equal(draft.additionalReasons[2], "");
  assert.equal(
    combineReviewReason(draft.reason, draft.additionalReasons[1]),
    `${REPORT_REVIEW_FLAGS[0].reason}\n${REPORT_REVIEW_FLAGS[1].reason}`,
  );
});

test("does not apply one group's reason to reports with unrelated flags", () => {
  const draft = getReviewReasonDraft(
    [report(1, ["MISSING_SIGNATURE"]), report(2, ["MISSING_WORKFORCE"])],
    "MISSING_SIGNATURE",
  );
  assert.equal(draft.reason, "");
  assert.equal(draft.additionalReasons[1], REPORT_REVIEW_FLAGS[1].reason);
  assert.equal(draft.additionalReasons[2], REPORT_REVIEW_FLAGS[0].reason);
  assert.deepEqual(getReviewReasonDraft([]).additionalReasons, {});
  assert.equal(getReviewReasonDraft([], "MISSING_SIGNATURE").reason, "");
});

test("trims reasons and enforces the combined 1,000-character limit", () => {
  assert.equal(combineReviewReason("  Chung  ", "  Riêng  "), "Chung\nRiêng");
  assert.equal(combineReviewReason("  Chung  "), "Chung");
  assert.equal(isValidReviewReason("x".repeat(9)), false);
  assert.equal(isValidReviewReason("x".repeat(10)), true);
  assert.equal(isValidReviewReason("x".repeat(1000)), true);
  assert.equal(
    isValidReviewReason(combineReviewReason("x".repeat(1000), "y")),
    false,
  );
});

test("uses custom labels in common and individual reason drafts", () => {
  const custom = {
    value: `CUSTOM_${"A".repeat(32)}`,
    label: "Thiếu số liệu quý III",
    reason: "Vui lòng bổ sung số liệu quý III.",
  };
  const catalog = [...REPORT_REVIEW_FLAGS, custom];
  const draft = getReviewReasonDraft(
    [report(1, [custom.value, "MISSING_SIGNATURE"]), report(2, [custom.value])],
    custom.value,
    catalog,
  );
  assert.equal(draft.reason, custom.reason);
  assert.equal(draft.additionalReasons[1], REPORT_REVIEW_FLAGS[1].reason);
  assert.equal(draft.additionalReasons[2], "");
  const mixed = getReviewReasonDraft(
    [report(1, [custom.value]), report(2, ["MISSING_SIGNATURE"])],
    "",
    catalog,
  );
  assert.equal(mixed.reason, "");
  assert.equal(mixed.additionalReasons[1], custom.reason);
});

const calls = [];
let failingId = null;
globalThis.__reportReviewApi = {
  receive: async (...args) => {
    calls.push(["receive", ...args]);
  },
  returnForSupplement: async (...args) => {
    calls.push(["return", ...args]);
    if (args[0] === failingId) throw new Error("Báo cáo đã được thay đổi");
  },
};
const apiUrl = moduleUrl(
  "export const adminOccupationalAccidentReportApi = globalThis.__reportReviewApi;",
);
const errorUrl = moduleUrl(
  "export const getErrorMessage = error => error.message;",
);
const bulkSource = compile(
  await readFile(
    new URL(
      "../src/Components/AdminOccupationalAccidentReport/bulkReview.ts",
      import.meta.url,
    ),
    "utf8",
  ),
)
  .replaceAll('"@/services/occupationalAccidentReport"', JSON.stringify(apiUrl))
  .replaceAll('"@/services/user"', JSON.stringify(errorUrl))
  .replaceAll('"@/constants/reportReviewFlags"', JSON.stringify(flagUrl));
const { reviewReportBatch } = await import(moduleUrl(bulkSource));

test("bulk review sends per-report reasons and versions, skips ineligible reports and retains failures", async () => {
  calls.length = 0;
  failingId = 2;
  const progress = [];
  const reports = [report(1, []), report(2, []), report(3, [], "RETURNED")];
  const result = await reviewReportBatch(
    reports,
    "return",
    "  Lý do chung đủ dài  ",
    (count) => progress.push(count),
    { 1: "Nội dung riêng" },
  );
  assert.deepEqual(calls, [
    ["return", 1, "Lý do chung đủ dài\nNội dung riêng", 11],
    ["return", 2, "Lý do chung đủ dài", 12],
  ]);
  assert.deepEqual(result.successfulIds, [1]);
  assert.equal(result.failures[0].report.id, 2);
  assert.match(result.failures[0].message, /thay đổi/);
  assert.deepEqual(progress, [2]);
  calls.length = 0;
  failingId = null;
  await reviewReportBatch(
    result.failures.map((item) => item.report),
    "return",
    "Lý do chung đủ dài",
    () => {},
  );
  assert.deepEqual(calls, [["return", 2, "Lý do chung đủ dài", 12]]);
});

test("validates every composed reason before issuing the first bulk request", async () => {
  calls.length = 0;
  await assert.rejects(
    reviewReportBatch(
      [report(1, []), report(2, [])],
      "return",
      "Lý do chung đủ dài",
      () => {},
      { 2: "x".repeat(1000) },
    ),
    /Doanh nghiệp 2/,
  );
  assert.deepEqual(calls, []);
});

test("bulk receiving carries the reviewed version", async () => {
  calls.length = 0;
  await reviewReportBatch(
    [report(1, []), report(2, [], "RECEIVED")],
    "receive",
    "",
    () => {},
  );
  assert.deepEqual(calls, [["receive", 1, 11]]);
});
