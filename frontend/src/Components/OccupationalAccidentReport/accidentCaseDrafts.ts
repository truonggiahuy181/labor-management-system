import type { AccidentCaseBody } from "@/services/occupationalAccidentReport";
import { createEmptyAccidentCase } from "./accidentCaseValidation";

export interface AccidentCaseDraft {
  clientId: string;
  body: AccidentCaseBody;
}

export const MAX_CASES_PER_ADD = 100;

export const parseAdditionalCaseCount = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const count = Number(value);
  return Number.isInteger(count) && count > 0 && count <= MAX_CASES_PER_ADD
    ? count
    : null;
};

export const createAccidentCaseDrafts = (
  count: number,
): AccidentCaseDraft[] => {
  if (parseAdditionalCaseCount(String(count)) === null)
    throw new RangeError(
      `Số vụ cần thêm phải là số nguyên từ 1 đến ${MAX_CASES_PER_ADD}.`,
    );
  return Array.from({ length: count }, () => ({
    clientId: crypto.randomUUID(),
    body: createEmptyAccidentCase(),
  }));
};

export const getCaseDraftStorageKey = (
  enterpriseId: number,
  reportId: number,
) => `occupational-accident-case-drafts:v1:${enterpriseId}:${reportId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isCount = (value: unknown) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 2_147_483_647;

const isDraft = (value: unknown): value is AccidentCaseDraft => {
  if (
    !isRecord(value) ||
    typeof value.clientId !== "string" ||
    !/^[a-zA-Z0-9-]+$/.test(value.clientId)
  )
    return false;
  const body = value.body;
  if (!isRecord(body) || typeof body.accidentDate !== "string") return false;
  if (
    !["primaryCauseId", "injuryFactorId", "lostWorkDays"].every((key) =>
      isCount(body[key]),
    )
  )
    return false;
  if (
    ![
      "medicalCostVnd",
      "salaryCostVnd",
      "compensationCostVnd",
      "propertyDamageVnd",
    ].every(
      (key) =>
        typeof body[key] === "string" && /^\d{1,19}$/.test(body[key] as string),
    )
  )
    return false;
  return (
    Array.isArray(body.victimGroups) &&
    body.victimGroups.length > 0 &&
    body.victimGroups.every(
      (group: unknown) =>
        isRecord(group) &&
        typeof group.isUnderEnterpriseManagement === "boolean" &&
        [
          "occupationId",
          "victimCount",
          "femaleCount",
          "deathCount",
          "severeCount",
        ].every((key) => isCount(group[key])),
    )
  );
};

export const parseAccidentCaseDrafts = (
  raw: string | null,
): AccidentCaseDraft[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = new Set<string>();
    return parsed.filter((value): value is AccidentCaseDraft => {
      if (!isDraft(value) || ids.has(value.clientId)) return false;
      ids.add(value.clientId);
      return true;
    });
  } catch {
    return [];
  }
};
