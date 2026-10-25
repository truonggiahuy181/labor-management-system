import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database-options.js';

config({
  path: ['.env', 'backend/.env'],
  override: false,
  quiet: true,
});

const cliOptions = createDatabaseOptions(
  (key, defaultValue) => process.env[key] ?? defaultValue,
);

// CLI commands must only perform the requested action. Automatic execution is
// reserved for Nest application startup.
const dataSource = new DataSource({ ...cliOptions, migrationsRun: false });

export default dataSource;
