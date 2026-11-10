import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { config as loadEnvironment } from 'dotenv';
import { seedReferenceData } from '../src/database/seeds/reference-data-seed.js';
import { bootstrapAdmin } from '../src/database/seeds/admin-bootstrap.js';
import { E2E_ADMIN } from './e2e-fixtures.js';

loadEnvironment({ path: ['.env', 'backend/.env'], override: false, quiet: true });

function databaseConnection(database: string) {
  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database,
  };
}

export default async function setup(): Promise<void> {
  const developmentDatabase =
    process.env.E2E_DEVELOPMENT_DB_NAME?.trim() || 'quan_ly_lao_dong';
  const testDatabase =
    process.env.TEST_DB_NAME?.trim() || `${developmentDatabase}_test`;

  if (
    testDatabase === developmentDatabase ||
    !/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(testDatabase)
  ) {
    throw new Error('TEST_DB_NAME must be a safe name distinct from DB_NAME.');
  }

  const adminDataSource = new DataSource(databaseConnection('postgres'));
  await adminDataSource.initialize();
  try {
    const existing = await adminDataSource.query<Array<{ exists: boolean }>>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists',
      [testDatabase],
    );
    if (!existing[0]?.exists) {
      await adminDataSource.query(`CREATE DATABASE "${testDatabase}"`);
    }
  } finally {
    await adminDataSource.destroy();
  }

  const testDataSource = new DataSource({
    ...databaseConnection(testDatabase),
    entities: [],
    migrations: [
      join(
        process.cwd(),
        'dist',
        'database',
        'migrations',
        '*.migration.js',
      ),
    ],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false,
    migrationsTransactionMode: 'each',
    synchronize: false,
    logging: false,
  });

  await testDataSource.initialize();
  try {
    await testDataSource.runMigrations({ transaction: 'each' });
    await testDataSource.transaction(async (manager) => {
      await seedReferenceData(manager);
      await bootstrapAdmin(manager, E2E_ADMIN);
    });
  } finally {
    await testDataSource.destroy();
  }
}
