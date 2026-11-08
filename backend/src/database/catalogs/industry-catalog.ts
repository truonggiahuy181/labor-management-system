import { INDUSTRY_CATALOG_DATA } from './industry-catalog.data.js';

export interface IndustryCatalogDefinition {
  industryCode: string;
  industryName: string;
  parentCode: string | null;
  isActive: boolean;
}

export interface IndustrySeedRow {
  industry_code: string;
  industry_name: string;
  parent_code: string | null;
  level: number;
  is_active: boolean;
}

type ResolvedIndustryCatalogEntry = IndustrySeedRow;

export const INDUSTRY_CATALOG: readonly IndustryCatalogDefinition[] =
  INDUSTRY_CATALOG_DATA.map(
    ([industryCode, industryName, parentCode]): IndustryCatalogDefinition => ({
      industryCode,
      industryName,
      parentCode,
      isActive: true,
    }),
  );

function validateOfficialIndustryCode(
  industryCode: string,
  level: number,
  parentCode: string | null,
): void {
  const pattern = level === 1 ? /^[A-V]$/ : new RegExp(`^[0-9]{${level}}$`);

  if (!pattern.test(industryCode)) {
    throw new Error(
      `Industry ${industryCode} has an invalid level-${level} code.`,
    );
  }

  if (level >= 3 && parentCode && !industryCode.startsWith(parentCode)) {
    throw new Error(
      `Industry ${industryCode} must extend parent code ${parentCode}.`,
    );
  }
}

function resolveIndustryCatalog(): ResolvedIndustryCatalogEntry[] {
  const resolvedByCode = new Map<string, ResolvedIndustryCatalogEntry>();
  const rows: ResolvedIndustryCatalogEntry[] = [];

  for (const item of INDUSTRY_CATALOG) {
    const industryCode = item.industryCode.trim().toUpperCase();
    const parentCode = item.parentCode?.trim().toUpperCase() ?? null;
    const parent = parentCode === null ? null : resolvedByCode.get(parentCode);

    if (parentCode !== null && !parent) {
      throw new Error(
        `Industry ${industryCode} references unknown parent ${parentCode}.`,
      );
    }
    if (resolvedByCode.has(industryCode)) {
      throw new Error(`Duplicate industry code ${industryCode}.`);
    }

    const level = parent ? parent.level + 1 : 1;
    if (level > 4) {
      throw new Error(`Industry ${industryCode} exceeds level 4.`);
    }
    validateOfficialIndustryCode(industryCode, level, parentCode);

    const resolved: ResolvedIndustryCatalogEntry = {
      industry_code: industryCode,
      industry_name: item.industryName,
      parent_code: parentCode,
      level,
      is_active: item.isActive,
    };
    resolvedByCode.set(industryCode, resolved);
    rows.push(resolved);
  }

  return rows;
}

const RESOLVED_INDUSTRY_CATALOG = resolveIndustryCatalog();

export function buildIndustrySeedRows(): IndustrySeedRow[] {
  return RESOLVED_INDUSTRY_CATALOG.map((row) => ({ ...row }));
}

export function getStoredIndustryCode(industryCode: string): string {
  const normalizedCode = industryCode.trim().toUpperCase();
  const resolved = RESOLVED_INDUSTRY_CATALOG.find(
    (item) => item.industry_code === normalizedCode,
  );

  if (!resolved) {
    throw new Error(`Unknown industry code ${industryCode}.`);
  }
  return resolved.industry_code;
}
