import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "../node_modules/typescript/lib/typescript.js";

const source = await readFile(
  new URL(
    "../src/Components/OccupationalAccidentReport/reportHeaderValidation.ts",
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
const { getReportHeaderErrors } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("requires a positive integer workforce without coercing invalid input", () => {
  for (const total of [
    "",
    " ",
    "0",
    "-1",
    "1.5",
    "1e2",
    "NaN",
    "Infinity",
    "2147483648",
  ]) {
    assert.ok(
      getReportHeaderErrors(total, "0", [], "1000").totalEmployees,
      total,
    );
  }
  for (const total of ["1", "100", "2147483647"]) {
    assert.deepEqual(getReportHeaderErrors(total, "0", [], "1000"), {});
  }
});

test("allows zero female employees and rejects invalid or inconsistent female totals", () => {
  for (const female of ["0", "10"]) {
    assert.deepEqual(getReportHeaderErrors("10", female, [], "1000"), {});
  }
  for (const female of ["", "-1", "1.5", "1e1", "11", "2147483648"]) {
    assert.ok(
      getReportHeaderErrors("10", female, [], "1000").femaleEmployees,
      female,
    );
  }
});

const victimGroup = (victimCount, femaleCount, managed = true) => ({
  victimCount,
  femaleCount,
  isUnderEnterpriseManagement: managed,
});

test("retains per-case managed victim constraints and excludes unmanaged victims", () => {
  const cases = [
    {
      victimGroups: [
        victimGroup(3, 2),
        victimGroup(2, 1),
        victimGroup(100, 100, false),
      ],
    },
    { victimGroups: [victimGroup(4, 2)] },
  ];
  assert.deepEqual(getReportHeaderErrors("5", "3", cases, "1000"), {});
  assert.match(
    getReportHeaderErrors("4", "3", cases, "1000").totalEmployees,
    /5 nạn nhân/,
  );
  assert.match(
    getReportHeaderErrors("5", "2", cases, "1000").femaleEmployees,
    /3 lao động nữ/,
  );
});

test("requires a positive integer payroll within the database money limit", () => {
  for (const payroll of [
    "",
    "0",
    "0000",
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    "1e3",
    "9223372036854775808",
    "10000000000000000000",
  ]) {
    assert.ok(
      getReportHeaderErrors("10", "0", [], payroll).payrollFundVnd,
      payroll,
    );
  }
  for (const payroll of ["1", "0001", "1000000", "9223372036854775807"]) {
    assert.deepEqual(getReportHeaderErrors("10", "0", [], payroll), {});
  }
});
