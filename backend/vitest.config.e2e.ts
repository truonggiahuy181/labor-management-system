import { defineConfig } from 'vitest/config';
import { config as loadEnvironment } from 'dotenv';

loadEnvironment({ path: ['.env', 'backend/.env'], override: false, quiet: true });

const developmentDatabase = process.env.DB_NAME?.trim() || 'quan_ly_lao_dong';
const testDatabase =
  process.env.TEST_DB_NAME?.trim() || `${developmentDatabase}_test`;

if (testDatabase === developmentDatabase) {
  throw new Error('TEST_DB_NAME must be different from DB_NAME.');
}

process.env.NODE_ENV = 'test';
process.env.E2E_DEVELOPMENT_DB_NAME = developmentDatabase;
process.env.DB_NAME = testDatabase;
process.env.DB_MIGRATIONS_RUN = 'false';
process.env.SEED_SAMPLE_DATA = 'false';
process.env.BOOTSTRAP_ADMIN_ENABLED = 'false';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/e2e.global-setup.ts'],
    hookTimeout: 30_000,
  },
});
