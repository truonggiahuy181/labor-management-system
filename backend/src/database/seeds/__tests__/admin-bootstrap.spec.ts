import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapAdmin } from '../admin-bootstrap.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-bootstrap-password'),
}));

describe('bootstrapAdmin', () => {
  let manager: { query: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    manager = {
      query: vi.fn(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('FROM users')) return [];
        if (sql.includes('INSERT INTO users')) {
          return [{ username: parameters?.[0] }];
        }
        return [];
      }),
    };
  });

  it('creates an admin with normalized input', async () => {
    await expect(
      bootstrapAdmin(manager as never, {
        username: ' initial_admin ',
        password: 'a-secure-password',
        email: ' ADMIN@EXAMPLE.COM ',
      }),
    ).resolves.toEqual({ created: true, username: 'initial_admin' });

    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO users'),
      [
        'initial_admin',
        'hashed-bootstrap-password',
        'Quản trị viên',
        'admin@example.com',
      ],
    );
  });

  it('is idempotent for the same active admin', async () => {
    manager.query.mockResolvedValueOnce([
      {
        username: 'initial_admin',
        email: 'admin@example.com',
        role_code: 'ADMIN',
      },
    ]);

    await expect(
      bootstrapAdmin(manager as never, {
        username: 'initial_admin',
        password: 'a-secure-password',
        email: 'admin@example.com',
      }),
    ).resolves.toEqual({ created: false, username: 'initial_admin' });
    expect(manager.query).toHaveBeenCalledOnce();
  });

  it('rejects a short password before querying the database', async () => {
    await expect(
      bootstrapAdmin(manager as never, {
        username: 'initial_admin',
        password: 'too-short',
        email: 'admin@example.com',
      }),
    ).rejects.toThrow(/at least 12 characters/);
    expect(manager.query).not.toHaveBeenCalled();
  });
});
