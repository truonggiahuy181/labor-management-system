import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataSourceOptions } from 'typeorm';

type EnvironmentReader = (
  key: string,
  defaultValue?: string,
) => string | undefined;

const currentDirectory = dirname(fileURLToPath(import.meta.url));

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function createDatabaseOptions(
  readEnvironment: EnvironmentReader,
): DataSourceOptions {
  const environment = readEnvironment('NODE_ENV', 'development');
  const runMigrationsByDefault =
    environment === 'production' ? 'false' : 'true';

  return {
    type: 'postgres',
    host: readEnvironment('DB_HOST', 'localhost'),
    port: Number(readEnvironment('DB_PORT', '5432')),
    username: readEnvironment('DB_USERNAME', 'postgres'),
    password: readEnvironment('DB_PASSWORD', ''),
    database: readEnvironment('DB_NAME', 'quan_ly_lao_dong'),
    entities: [
      join(currentDirectory, '..', 'modules', '**', '*.entity{.js,.ts}'),
    ],
    migrations: [join(currentDirectory, 'migrations', '*.migration{.js,.ts}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: isEnabled(
      readEnvironment('DB_MIGRATIONS_RUN', runMigrationsByDefault),
    ),
    migrationsTransactionMode: 'each',
    // Schema changes must be represented by a migration. Never combine
    // synchronize with migrations because synchronize has no audit trail.
    synchronize: false,
    logging: environment === 'development',
  };
}
