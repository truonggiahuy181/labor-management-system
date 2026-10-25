import { createDatabaseOptions } from './database-options.js';

function optionsFrom(environment: Record<string, string>) {
  return createDatabaseOptions(
    (key, defaultValue) => environment[key] ?? defaultValue,
  );
}

describe('createDatabaseOptions', () => {
  it('runs migrations by default in development', () => {
    const options = optionsFrom({ NODE_ENV: 'development' });

    expect(options.migrationsRun).toBe(true);
    expect(options.synchronize).toBe(false);
  });

  it('does not run migrations by default in production', () => {
    const options = optionsFrom({ NODE_ENV: 'production' });

    expect(options.migrationsRun).toBe(false);
    expect(options.synchronize).toBe(false);
  });

  it('allows automatic migrations to be disabled explicitly', () => {
    const options = optionsFrom({
      NODE_ENV: 'development',
      DB_MIGRATIONS_RUN: 'false',
    });

    expect(options.migrationsRun).toBe(false);
  });
});
