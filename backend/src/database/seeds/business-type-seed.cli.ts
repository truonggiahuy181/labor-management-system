import dataSource from '../data-source.js';
import { seedBusinessTypeCatalog } from './business-type-seed.js';

try {
  await dataSource.initialize();
  const result = await dataSource.transaction((manager) =>
    seedBusinessTypeCatalog(manager),
  );
  console.log(`Business type catalog ready: ${result.totalCount} records.`);
} catch (error) {
  console.error('Business type catalog seed failed.', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
