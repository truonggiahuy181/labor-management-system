# Backend - Hệ Thống Quản Lý Lao Động

## 1. Yêu cầu môi trường

- **Node.js**: v18+ hoặc v20+
- **Docker**: Đã cài đặt và đang chạy Docker Desktop

---

## 2. Chuẩn bị biến môi trường

Sao chép file cấu hình mẫu:

```bash
cp .env.example .env
```

_(Nếu cần, chỉnh sửa cổng hoặc mật khẩu trong file `.env`)_

---

## 3. Khởi chạy Database & Redis (Docker)

Chạy PostgreSQL và Redis dưới nền:

```bash
npm run docker:up
```

- Dừng containers khi không dùng:
  ```bash
  npm run docker:down
  ```
- Xem log các container:
  ```bash
  npm run docker:logs
  ```

---

## 4. Cài đặt & Khởi chạy Backend

```bash
# Cài đặt dependencies
npm install

# Khởi chạy server ở chế độ dev
npm run start:dev
```

- **API URL**: `http://localhost:3000/api/v1`
- **Swagger UI (Tài liệu API)**: `http://localhost:3000/api/docs`

### Database migration

Backend dùng TypeORM migration và lưu lịch sử trong bảng
`typeorm_migrations`. Khi `DB_MIGRATIONS_RUN=true`, các migration còn thiếu
sẽ tự chạy trước khi ứng dụng nhận request.

```bash
# Xem trạng thái
npm run migration:show

# Chạy thủ công (thường dùng trong CI/CD)
npm run migration:run

# Hoàn tác migration gần nhất
npm run migration:revert

# Sinh migration sau khi sửa entity
npm run migration:generate
```

Không dùng `synchronize`; mọi thay đổi schema phải được ghi lại
bằng migration trong `src/database/migrations`.

---

## 5. Chạy kiểm thử tự động (Unit Test)

```bash
# Chạy riêng các bài test của module user
npx vitest run src/modules/user

# Chạy toàn bộ test trong dự án
npm test
```

---

## 6. Lưu trữ ảnh và tài liệu trên Cloudflare R2

Hiện tại có thể dùng bucket R2 sẵn có làm bucket public cho `avatars/logos` và bật
Public Development URL hoặc custom domain. Khi cần lưu `documents`, tạo thêm bucket
private và cấp cho API token quyền `Object Read & Write` trên bucket đó.

Khai báo Account ID, bucket và S3-compatible credentials trong `.env`:

```dotenv
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=your-existing-public-image-bucket
R2_PRIVATE_BUCKET=
R2_PUBLIC_BASE_URL=https://your-public-bucket-domain.example.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_PRESIGNED_URL_TTL=900
```

Không commit credentials. Backend dùng AWS SDK v3 qua S3-compatible endpoint
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, Region `auto`; R2 tự động mã hóa
file lưu trữ.

- `POST /api/v1/files`: nhận `multipart/form-data` gồm `file` và `folder`.
- `POST /api/v1/users/me/avatar`: upload và tự gắn avatar vào tài khoản hiện tại.
- `GET /api/v1/files/access-url?objectKey=...`: trả URL public cho ảnh hoặc URL có thời hạn cho tài liệu.
- `avatars`, `logos`: jpg/jpeg/png/gif/webp, tối đa 5 MB.
- `documents`: pdf/doc/docx/xls/xlsx, tối đa 10 MB.

Nếu `R2_PRIVATE_BUCKET` để trống, upload `documents` trả `503` để tránh vô tình lưu
tài liệu vào bucket public. Khi cần dùng tài liệu, tạo bucket private rồi điền biến này.

Luôn lưu `objectKey` vào dữ liệu nghiệp vụ. `avatarUrl` và URL logo là URL public cố định;
presigned URL của `documents` không được lưu vì sẽ hết hạn. `documents` chỉ chủ sở hữu
hoặc `ADMIN` được truy cập.
