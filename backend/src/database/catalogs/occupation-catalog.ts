import { OCCUPATION_CATALOG_DATA } from './occupation-catalog.data.js';

export interface OccupationSeedRow {
  occupationCode: string;
  occupationName: string;
  parentCode: string | null;
  level: 1 | 2 | 3 | 4;
  isActive: boolean;
}

function resolveOccupationCatalog(): OccupationSeedRow[] {
  const resolvedByCode = new Map<string, OccupationSeedRow>();
  const rows: OccupationSeedRow[] = [];

  for (const [rawCode, rawName, rawParentCode] of OCCUPATION_CATALOG_DATA) {
    const occupationCode = rawCode.trim();
    const occupationName = rawName.trim().replace(/\s+/g, ' ');
    const parentCode = rawParentCode?.trim() ?? null;
    const level = occupationCode.length as OccupationSeedRow['level'];

    if (!/^[0-9]{1,4}$/.test(occupationCode) || level < 1 || level > 4) {
      throw new Error(`Occupation ${occupationCode} has an invalid code.`);
    }
    if (!occupationName) {
      throw new Error(`Occupation ${occupationCode} has no name.`);
    }
    if (resolvedByCode.has(occupationCode)) {
      throw new Error(`Duplicate occupation code ${occupationCode}.`);
    }

    const parent = parentCode === null ? null : resolvedByCode.get(parentCode);
    if (level === 1 && parentCode !== null) {
      throw new Error(
        `Level-1 occupation ${occupationCode} cannot have a parent.`,
      );
    }
    if (level > 1) {
      if (parentCode === null || !parent || parent.level !== level - 1) {
        throw new Error(
          `Occupation ${occupationCode} references invalid parent ${parentCode}.`,
        );
      }
      if (!occupationCode.startsWith(parentCode)) {
        throw new Error(
          `Occupation ${occupationCode} must extend parent ${parentCode}.`,
        );
      }
    }

    const resolved: OccupationSeedRow = {
      occupationCode,
      occupationName,
      parentCode,
      level,
      isActive: true,
    };
    resolvedByCode.set(occupationCode, resolved);
    rows.push(resolved);
  }

  const counts = Object.fromEntries(
    [1, 2, 3, 4].map((currentLevel) => [
      currentLevel,
      rows.filter((row) => row.level === currentLevel).length,
    ]),
  );
  const expectedCounts: Record<number, number> = {
    1: 10,
    2: 48,
    3: 152,
    4: 507,
  };
  for (const currentLevel of [1, 2, 3, 4]) {
    if (counts[currentLevel] !== expectedCounts[currentLevel]) {
      throw new Error(
        `Occupation level ${currentLevel} has ${counts[currentLevel]} records; expected ${expectedCounts[currentLevel]}.`,
      );
    }
  }

  return rows;
}

export const OCCUPATION_CATALOG: readonly OccupationSeedRow[] =
  resolveOccupationCatalog();
