BEGIN;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX uq_roles_role_code ON roles (role_code);

-- Giữ nguyên các ID vai trò đang được bảng users sử dụng.
INSERT INTO roles (id, role_code, role_name)
VALUES
  (1, 'ADMIN', 'Quản trị viên'),
  (2, 'ENTERPRISE_USER', 'Người dùng doanh nghiệp');

SELECT setval(
  pg_get_serial_sequence('roles', 'id'),
  COALESCE((SELECT MAX(id) FROM roles), 1),
  TRUE
);

ALTER TABLE users
  ALTER COLUMN username TYPE VARCHAR(50),
  ALTER COLUMN password_hash TYPE VARCHAR(255),
  ALTER COLUMN full_name TYPE VARCHAR(100),
  ALTER COLUMN email TYPE VARCHAR(100),
  ALTER COLUMN phone_number TYPE VARCHAR(20),
  ALTER COLUMN title TYPE VARCHAR(100),
  ALTER COLUMN avatar_url TYPE VARCHAR(255),
  ALTER COLUMN province_id TYPE VARCHAR(20),
  ALTER COLUMN district_id TYPE VARCHAR(20),
  ALTER COLUMN ward_id TYPE VARCHAR(20),
  ALTER COLUMN address TYPE VARCHAR(255),
  ALTER COLUMN reset_password_token TYPE VARCHAR(255),
  ALTER COLUMN email_change_otp TYPE VARCHAR(10),
  ALTER COLUMN email_change_pending TYPE VARCHAR(100);

ALTER TABLE users
  ADD CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

COMMIT;
