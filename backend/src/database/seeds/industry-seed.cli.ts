import dataSource from '../data-source.js';
import { seedIndustryCatalog } from './industry-seed.js';

try {
  await dataSource.initialize();
  const result = await dataSource.transaction((manager) =>
    seedIndustryCatalog(manager),
  );
  console.log(
    `Industry catalog ready: ${result.totalCount} records ` +
      `(level 1: ${result.levelCounts[1]}, level 2: ${result.levelCounts[2]}, ` +
      `level 3: ${result.levelCounts[3]}, level 4: ${result.levelCounts[4]}). ` +
      `Migrated ${result.migratedEnterpriseCount} enterprise references and ` +
      `retired ${result.retiredLegacyCount} legacy codes.`,
  );
} catch (error) {
  console.error('Industry catalog seed failed.', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
