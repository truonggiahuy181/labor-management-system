BEGIN;

DROP INDEX IF EXISTS "IDX_4a2fee81e0371b27e68c0fad6a";
DROP INDEX IF EXISTS "IDX_d5d623090c8977c2cd2a905d65";

ALTER TABLE users DROP COLUMN deleted_at;
ALTER TABLE enterprises DROP COLUMN deleted_at;

CREATE UNIQUE INDEX uq_users_username ON users (username);
CREATE UNIQUE INDEX uq_enterprises_tax_code ON enterprises (tax_code);

COMMIT;
