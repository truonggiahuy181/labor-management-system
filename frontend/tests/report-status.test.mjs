import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "../node_modules/typescript/lib/typescript.js";

const source = await readFile(
  new URL(
    "../src/Components/OccupationalAccidentReport/reportStatus.ts",
    import.meta.url,
  ),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { getReportStatus } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("unfinished reports display overdue after their submission deadline", () => {
  for (const status of ["NOT_STARTED", "DRAFT", "RETURNED"]) {
    assert.deepEqual(
      getReportStatus(status, "2026-07-04", new Date("2026-11-21T00:00:00Z")),
      {
        label: "Quá hạn",
        color: "error",
      },
    );
  }
});

test("the last submission date remains open until midnight in Vietnam", () => {
  assert.equal(
    getReportStatus("DRAFT", "2026-11-21", new Date("2026-11-21T16:59:59Z"))
      .label,
    "Đang khai báo",
  );
  assert.equal(
    getReportStatus("DRAFT", "2026-11-21", new Date("2026-11-21T17:00:00Z"))
      .label,
    "Quá hạn",
  );
});

test("future periods and open periods retain their original workflow status", () => {
  const now = new Date("2026-11-21T00:00:00Z");
  assert.equal(
    getReportStatus("NOT_STARTED", "2027-01-09", now).label,
    "Chưa khai báo",
  );
  assert.equal(
    getReportStatus("RETURNED", "2026-12-31", now).label,
    "Yêu cầu bổ sung",
  );
});

test("submitted and received reports retain their completed workflow status after the deadline", () => {
  const now = new Date("2026-11-21T00:00:00Z");
  assert.equal(getReportStatus("SUBMITTED", "2026-07-04", now).label, "Đã gửi");
  assert.equal(
    getReportStatus("RECEIVED", "2026-07-04", now).label,
    "Đã tiếp nhận",
  );
});
