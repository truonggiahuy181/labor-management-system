import dataSource from '../data-source.js';
import { seedReferenceData } from './reference-data-seed.js';

try {
  await dataSource.initialize();
  const migrations = await dataSource.runMigrations({ transaction: 'each' });
  const result = await dataSource.transaction(seedReferenceData);
  console.log(
    `Database ready: ${migrations.length} migration(s) applied; ` +
      `${result.roles.totalCount} roles, ` +
      `${result.locations.provinceCount} provinces, ` +
      `${result.locations.wardCount} wards, ` +
      `${result.businessTypes.totalCount} business types, ` +
      `${result.industries.totalCount} industries and ` +
      `${result.occupations.totalCount} occupations verified.`,
  );
} catch (error) {
  console.error('Database setup failed.', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
