import * as argon2 from 'argon2';
import type { EntityManager } from 'typeorm';

export interface AdminBootstrapInput {
  username: string;
  password: string;
  email: string;
  fullName?: string;
}

export interface AdminBootstrapResult {
  created: boolean;
  username: string;
}

interface ExistingAdminRow {
  username: string;
  email: string | null;
  role_code: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function bootstrapAdmin(
  manager: Pick<EntityManager, 'query'>,
  input: AdminBootstrapInput,
): Promise<AdminBootstrapResult> {
  const username = input.username.trim();
  const password = input.password;
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName?.trim() || 'Quản trị viên';

  if (!username || username.length > 50) {
    throw new Error('BOOTSTRAP_ADMIN_USERNAME must contain 1-50 characters.');
  }
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 100) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }

  const existingRows = await manager.query<ExistingAdminRow[]>(
    `
      SELECT users.username, users.email, roles.role_code
      FROM users
      INNER JOIN roles ON roles.id = users.role_id
      WHERE users.deleted_at IS NULL
        AND (users.username = $1 OR LOWER(users.email) = $2)
    `,
    [username, email],
  );

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    if (
      existing.username === username &&
      existing.email?.toLowerCase() === email &&
      existing.role_code === 'ADMIN'
    ) {
      return { created: false, username };
    }
    throw new Error('Bootstrap admin username or email is already in use.');
  }

  const passwordHash = await argon2.hash(password);
  const insertedRows = await manager.query<Array<{ username: string }>>(
    `
      INSERT INTO users (
        username,
        password_hash,
        full_name,
        email,
        role_id,
        enterprise_id,
        is_active,
        created_by,
        updated_by
      )
      SELECT $1, $2, $3, $4, roles.id, NULL, TRUE, NULL, NULL
      FROM roles
      WHERE roles.role_code = 'ADMIN'
        AND roles.is_active = TRUE
        AND roles.deleted_at IS NULL
      RETURNING username
    `,
    [username, passwordHash, fullName, email],
  );

  if (insertedRows.length !== 1) {
    throw new Error(
      'Active ADMIN role is required. Run npm run seed:reference-data first.',
    );
  }

  return { created: true, username: insertedRows[0].username };
}
