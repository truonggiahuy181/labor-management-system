import dataSource from '../data-source.js';
import { seedOccupationCatalog } from './occupation-seed.js';

try {
  await dataSource.initialize();
  const result = await dataSource.transaction((manager) =>
    seedOccupationCatalog(manager),
  );
  console.log(
    `Occupation catalog ready: ${result.totalCount} records ` +
      `(level 1: ${result.levelCounts[1]}, level 2: ${result.levelCounts[2]}, ` +
      `level 3: ${result.levelCounts[3]}, level 4: ${result.levelCounts[4]}).`,
  );
} catch (error) {
  console.error('Occupation catalog seed failed.', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
