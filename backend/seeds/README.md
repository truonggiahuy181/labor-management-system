# Seed data

Các file trong thư mục này chỉ dùng cho môi trường development.

Khi `NODE_ENV=development` và `SEED_SAMPLE_DATA=true`, backend tự tạo User mẫu lúc khởi động nếu username chưa tồn tại. Cấu hình mặc định nằm trong `.env.example`.

## User mẫu

- Username: `admin_demo`
- Password: `Admin@123456`
- Role được lấy từ database bằng `role_code = ADMIN`.
- Seed có thể chạy lại an toàn; username đã tồn tại sẽ được bỏ qua.

Chạy backend bình thường để tự động seed:

```powershell
npm run start:dev
```

Service tự động nằm tại `src/database/seeds/user-seed.service.ts`. Việc seed luôn bị bỏ qua nếu không phải môi trường development.

Nếu cần chạy thủ công, dùng PostgreSQL trong Docker bằng PowerShell:

```powershell
Get-Content -Raw seeds/001_user_example.sql |
  docker exec -i labor-postgres psql -U postgres -d quan_ly_lao_dong -v ON_ERROR_STOP=1
```

Không sử dụng mật khẩu mẫu này ở production.
