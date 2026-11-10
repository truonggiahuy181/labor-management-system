# Hệ thống Quản lý Lao động

## Chạy local

Yêu cầu: Node.js 20+, npm 10+ và Docker Desktop đang chạy.

Từ thư mục gốc của repository, chạy một lệnh:

```bash
npm run dev
```

Lần chạy đầu tiên, lệnh này sẽ tự động:

1. Tạo `backend/.env` và `frontend/.env.local` từ file mẫu nếu chưa có.
2. Cài dependencies còn thiếu cho backend và frontend.
3. Khởi động PostgreSQL và Redis bằng Docker Compose.
4. Chạy migration, upsert toàn bộ danh mục và dữ liệu demo idempotent.
5. Chạy đồng thời backend và frontend.

Các lần chạy sau vẫn dùng lại database và không tạo dữ liệu trùng. Lệnh không ghi đè file `.env` đã tồn tại.

Nếu cổng mặc định đang được dùng, có thể đặt `LOCAL_BACKEND_PORT` và
`LOCAL_FRONTEND_PORT` trước khi chạy; script sẽ đồng bộ URL giữa hai ứng dụng.

- Frontend: http://localhost:3001
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs

Tài khoản local mặc định lấy từ [backend/.env.example](backend/.env.example):

- Admin: `admin_demo` / `change-me-local-only`
- Doanh nghiệp mẫu: `0990000001` / `change-me-local-only`

Nhấn `Ctrl+C` để dừng backend và frontend. PostgreSQL và Redis được giữ lại để lần sau khởi động nhanh hơn; khi cần dừng chúng, chạy:

```bash
npm run docker:down
```

## Nguyên tắc dữ liệu

- Migration và dữ liệu demo tự chạy khi `NODE_ENV=development` và `SEED_SAMPLE_DATA=true`.
- Seed dùng khóa nghiệp vụ và `ON CONFLICT`, nên chạy lại không nhân bản dữ liệu.
- Production không tự tạo dữ liệu demo.
- Không commit `.env`, mật khẩu thật, token hoặc thông tin truy cập dịch vụ ngoài.

Hướng dẫn chuyên sâu cho backend nằm tại [backend/README.md](backend/README.md).
