-- DEVELOPMENT ONLY
-- Tài khoản mẫu: admin_demo / Admin@123456
-- Đổi mật khẩu ngay nếu sử dụng ngoài môi trường local.

BEGIN;

DO $$
DECLARE
  admin_role_id INT;
BEGIN
  SELECT id
  INTO admin_role_id
  FROM roles
  WHERE role_code = 'ADMIN'
    AND is_active = TRUE;

  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy vai trò ADMIN đang hoạt động';
  END IF;

  INSERT INTO users (
    username,
    password_hash,
    full_name,
    dob,
    gender,
    email,
    phone_number,
    title,
    province_id,
    district_id,
    ward_id,
    address,
    role_id,
    enterprise_id,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  VALUES (
    'admin_demo',
    '$argon2id$v=19$m=65536,p=4,t=3$kuRt0X6Cy14kj10YPRp8Xw$sRH7sc7zF9LY0EKK8GAKueTC+HYac2nRw9sjXXQpgck',
    'Quản trị viên mẫu',
    DATE '1990-01-01',
    1,
    'admin.demo@example.com',
    '0901234567',
    'Quản trị viên',
    '01',
    '001',
    '00001',
    'Hà Nội',
    admin_role_id,
    NULL,
    TRUE,
    NULL,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (username) DO NOTHING;
END $$;

COMMIT;
