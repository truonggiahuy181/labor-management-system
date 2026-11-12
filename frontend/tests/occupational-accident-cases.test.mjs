import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "../node_modules/typescript/lib/typescript.js";

// Use the existing TypeScript dependency so these tests need no additional runner.
const sourceDirectory = new URL(
  "../src/Components/OccupationalAccidentReport/",
  import.meta.url,
);
const transpile = async (name) =>
  ts.transpileModule(await readFile(new URL(name, sourceDirectory), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const validationUrl = moduleUrl(await transpile("accidentCaseValidation.ts"));
const {
  createEmptyAccidentCase,
  getAccidentCaseErrors,
  isEmptyAccidentCase,
  toAccidentCaseBody,
} = await import(validationUrl);
const {
  createAccidentCaseDrafts,
  getCaseDraftStorageKey,
  parseAccidentCaseDrafts,
  parseAdditionalCaseCount,
} = await import(
  moduleUrl(
    (await transpile("accidentCaseDrafts.ts")).replace(
      '"./accidentCaseValidation"',
      JSON.stringify(validationUrl),
    ),
  )
);

const constraints = {
  totalEmployees: 10,
  femaleEmployees: 4,
  minDate: "2026-01-01",
  maxDate: "2026-12-31",
};
const validCase = () => ({
  ...createEmptyAccidentCase(),
  accidentDate: "2026-10-26",
  primaryCauseId: 1,
  injuryFactorId: 2,
  victimGroups: [
    {
      occupationId: 3,
      isUnderEnterpriseManagement: true,
      victimCount: 2,
      femaleCount: 1,
      deathCount: 0,
      severeCount: 1,
    },
  ],
});

test("quantity accepts freely entered integers and rejects invalid or excessive batches", () => {
  for (const value of ["1", "3", "17", "100"])
    assert.equal(parseAdditionalCaseCount(value), Number(value));
  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    "1e2",
    "101",
    "9999999999999999999999",
  ])
    assert.equal(parseAdditionalCaseCount(value), null, value);
  for (const value of [0, -1, 1.5, 101, Infinity])
    assert.throws(() => createAccidentCaseDrafts(value), RangeError);
});

test("adding three drafts preserves two existing cases and creates independent empty forms", () => {
  const existing = [{ id: 10 }, { id: 11 }];
  const added = createAccidentCaseDrafts(3);
  assert.equal([...existing, ...added].length, 5);
  assert.deepEqual(existing, [{ id: 10 }, { id: 11 }]);
  assert.equal(new Set(added.map((draft) => draft.clientId)).size, 3);
  for (const draft of added)
    assert.equal(isEmptyAccidentCase(draft.body), true);
  added[0].body.victimGroups[0].victimCount = 5;
  assert.equal(added[1].body.victimGroups[0].victimCount, 0);
  assert.equal(isEmptyAccidentCase(added[0].body), false);
});

test("unfinished drafts survive storage round trips and remain isolated by report and enterprise", () => {
  const drafts = createAccidentCaseDrafts(3);
  drafts[1].body.accidentDate = "2026-11-01";
  drafts[1].body.primaryCauseId = 8;
  assert.deepEqual(parseAccidentCaseDrafts(JSON.stringify(drafts)), drafts);
  assert.notEqual(getCaseDraftStorageKey(1, 2), getCaseDraftStorageKey(1, 3));
  assert.notEqual(getCaseDraftStorageKey(1, 2), getCaseDraftStorageKey(2, 2));
});

test("corrupt stored data cannot crash the editor or create duplicate draft keys", () => {
  for (const raw of [
    null,
    "",
    "{broken",
    "null",
    "{}",
    '[{"clientId":"broken"}]',
  ])
    assert.deepEqual(parseAccidentCaseDrafts(raw), []);
  const [draft] = createAccidentCaseDrafts(1);
  const corrupt = structuredClone(draft);
  corrupt.clientId = "corrupt";
  corrupt.body.medicalCostVnd = "not money";
  assert.deepEqual(
    parseAccidentCaseDrafts(JSON.stringify([draft, draft, corrupt])),
    [draft],
  );
});

test("empty cases have no inferred date, categories, occupation or victim and cannot be saved", () => {
  const body = createEmptyAccidentCase();
  const errors = getAccidentCaseErrors(body, constraints);
  for (const key of [
    "accidentDate",
    "primaryCauseId",
    "injuryFactorId",
    "victimGroups.0.occupationId",
    "victimGroups.0.victimCount",
  ])
    assert.ok(errors[key], key);
  assert.deepEqual(getAccidentCaseErrors(validCase(), constraints), {});
});

test("case dates must be real calendar dates within the reporting period", () => {
  for (const date of [
    "2025-12-31",
    "2027-01-01",
    "2026-02-30",
    "2026-13-01",
    "26/10/2026",
  ])
    assert.ok(
      getAccidentCaseErrors({ ...validCase(), accidentDate: date }, constraints)
        .accidentDate,
      date,
    );
  for (const date of ["2026-01-01", "2026-12-31"])
    assert.deepEqual(
      getAccidentCaseErrors(
        { ...validCase(), accidentDate: date },
        constraints,
      ),
      {},
    );
});

test("female victims and combined fatal and severe injuries cannot exceed the group total", () => {
  const body = validCase();
  Object.assign(body.victimGroups[0], {
    femaleCount: 3,
    deathCount: 2,
    severeCount: 1,
  });
  const errors = getAccidentCaseErrors(body, constraints);
  assert.ok(errors["victimGroups.0.femaleCount"]);
  assert.ok(errors["victimGroups.0.severeCount"]);
});

test("fractional and overflowing counts cannot be saved", () => {
  for (const value of [-1, 1.5, 2_147_483_648]) {
    const body = validCase();
    body.victimGroups[0].victimCount = value;
    body.lostWorkDays = value;
    const errors = getAccidentCaseErrors(body, constraints);
    assert.ok(errors["victimGroups.0.victimCount"]);
    assert.ok(errors.lostWorkDays);
  }
});

test("managed victims across groups respect the enterprise workforce", () => {
  const body = validCase();
  body.victimGroups.push({
    ...body.victimGroups[0],
    occupationId: 4,
    victimCount: 9,
  });
  assert.ok(getAccidentCaseErrors(body, constraints).victimGroups);
  body.victimGroups[1].isUnderEnterpriseManagement = false;
  assert.deepEqual(getAccidentCaseErrors(body, constraints), {});
  body.victimGroups[0].femaleCount = 2;
  assert.ok(
    getAccidentCaseErrors(body, { ...constraints, femaleEmployees: 1 })
      .victimGroups,
  );
});

test("duplicate occupation and management combinations are rejected but different scopes are allowed", () => {
  const body = validCase();
  body.victimGroups.push({ ...body.victimGroups[0] });
  assert.ok(
    getAccidentCaseErrors(body, constraints)["victimGroups.1.occupationId"],
  );
  body.victimGroups[1].isUnderEnterpriseManagement = false;
  assert.deepEqual(getAccidentCaseErrors(body, constraints), {});
});

test("editing saved data preserves every victim group and exact money values", () => {
  const body = validCase();
  const saved = {
    ...body,
    medicalCostVnd: "9007199254740993",
    accidentDate: "2026-10-26T00:00:00Z",
    accidentCause: { id: 1 },
    injuryFactor: { id: 2 },
    victimGroups: body.victimGroups.map((group) => ({
      ...group,
      occupation: { id: group.occupationId },
    })),
  };
  const result = toAccidentCaseBody(saved);
  assert.equal(result.accidentDate, "2026-10-26");
  assert.equal(result.medicalCostVnd, "9007199254740993");
  assert.deepEqual(result.victimGroups, body.victimGroups);
  result.victimGroups[0].victimCount = 9;
  assert.equal(saved.victimGroups[0].victimCount, 2);
});
