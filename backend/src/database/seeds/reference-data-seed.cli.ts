import dataSource from '../data-source.js';
import { seedReferenceData } from './reference-data-seed.js';

try {
  await dataSource.initialize();
  const result = await dataSource.transaction(seedReferenceData);
  console.log(
    `Reference data ready: ${result.roles.totalCount} roles, ` +
      `${result.locations.provinceCount} provinces, ` +
      `${result.locations.wardCount} wards, ` +
      `${result.businessTypes.totalCount} business types, ` +
      `${result.industries.totalCount} industries and ` +
      `${result.occupations.totalCount} occupations.`,
  );
} catch (error) {
  console.error('Reference data seed failed.', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
