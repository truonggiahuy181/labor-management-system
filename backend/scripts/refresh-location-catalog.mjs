import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://provinces.open-api.vn/api/v2/?depth=2';
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(
  currentDirectory,
  '..',
  'src',
  'database',
  'data',
  'vietnam-locations.latest.json',
);
const temporaryPath = `${outputPath}.tmp`;

function normalizeCode(value, length, label) {
  const code = String(value).padStart(length, '0');
  if (!new RegExp(`^\\d{${length}}$`).test(code)) {
    throw new Error(`Invalid ${label} code: ${value}`);
  }
  return code;
}

const response = await fetch(SOURCE_URL, {
  headers: { Accept: 'application/json' },
});
if (!response.ok) {
  throw new Error(
    `Cannot download location catalog: ${response.status} ${response.statusText}`,
  );
}

const source = await response.json();
if (!Array.isArray(source) || source.length !== 34) {
  throw new Error(
    `Expected 34 provinces from the v2 API, received ${source?.length ?? 'invalid data'}`,
  );
}

const provinces = [];
const wards = [];

for (const province of source) {
  const provinceCode = normalizeCode(province.code, 2, 'province');
  provinces.push({
    code: provinceCode,
    name: province.name,
    divisionType: province.division_type,
  });

  if (!Array.isArray(province.wards)) {
    throw new Error(`Province ${provinceCode} does not contain a ward list`);
  }

  for (const ward of province.wards) {
    wards.push({
      code: normalizeCode(ward.code, 5, 'ward'),
      provinceCode,
      name: ward.name,
      divisionType: ward.division_type,
    });
  }
}

if (wards.length !== 3321) {
  throw new Error(`Expected 3321 wards, received ${wards.length}`);
}

const catalog = {
  source: SOURCE_URL,
  version: 'post-2025-07',
  provinceCount: provinces.length,
  wardCount: wards.length,
  provinces,
  wards,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
await rename(temporaryPath, outputPath);

console.log(
  `Saved ${provinces.length} provinces and ${wards.length} wards to ${outputPath}`,
);
