# Backend - Hệ Thống Quản Lý Lao Động

> Với môi trường local của team, ưu tiên chạy `npm run dev` tại thư mục gốc
> repository. Lệnh này tự tạo file cấu hình còn thiếu, khởi động Docker,
> migration, dữ liệu demo, backend và frontend. Các bước bên dưới dành cho
> trường hợp cần chạy hoặc kiểm tra riêng backend.

## 1. Yêu cầu môi trường

- **Node.js**: v18+ hoặc v20+
- **Docker**: Đã cài đặt và đang chạy Docker Desktop

---

## 2. Chuẩn bị biến môi trường

Sao chép file cấu hình mẫu:

```bash
cp .env.example .env
```

_(Nếu cần, chỉnh sửa cổng hoặc mật khẩu trong file `.env`. File đã tồn tại sẽ
không bị lệnh chạy chung ghi đè.)_

Trong `backend/.env`, đặt:

```dotenv
NODE_ENV=development
DB_MIGRATIONS_RUN=true
SEED_SAMPLE_DATA=true
```

---

## 3. Cài đặt và khởi chạy

Chạy tại thư mục `backend`:

```bash
npm install
npm run docker:up
npm run start:dev
```

- **API URL**: `http://localhost:3000/api/v1`
- **Swagger UI**: `http://localhost:3000/api/docs`

Khi cần xóa dữ liệu cũ và khởi tạo lại database từ đầu:

```bash
docker compose down -v
npm run docker:up
npm run start:dev
```

> `docker compose down -v` sẽ xóa toàn bộ dữ liệu hiện có. Backend tự chạy
> migration và nạp dữ liệu mẫu khi khởi động.

- Dừng containers khi không dùng:
  ```bash
  npm run docker:down
  ```
- Xem log các container:
  ```bash
  npm run docker:logs
  ```

---

## 4. Database migration

Backend dùng TypeORM migration và lưu lịch sử trong bảng
`typeorm_migrations`. Khi `DB_MIGRATIONS_RUN=true`, các migration còn thiếu
sẽ tự chạy trước khi ứng dụng nhận request.

Ở development, `SEED_SAMPLE_DATA=true` còn tự upsert danh mục, admin, doanh
nghiệp, tài khoản doanh nghiệp, kỳ báo cáo và các catalog phục vụ demo. Seed
không chạy ngoài development và có thể chạy lại mà không nhân đôi dữ liệu.

Với môi trường mới, dùng một lệnh để chạy migration rồi upsert và kiểm chứng
toàn bộ dữ liệu tham chiếu bắt buộc (roles, địa giới, loại hình kinh doanh,
ngành kinh tế và nghề nghiệp):

```bash
npm run db:setup
```

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

# Chạy E2E trên database riêng được cấu hình bởi TEST_DB_NAME
npm run test:e2e
```

---

## 6. Lưu trữ ảnh và tài liệu trên Cloudflare R2

Hiện tại dùng bucket R2 sẵn có làm bucket public cho ảnh và tài liệu, đồng thời bật
Public Development URL hoặc custom domain. API token cần quyền `Object Read & Write`
trên bucket này.

Khai báo Account ID, bucket và S3-compatible credentials trong `.env`:

```dotenv
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=your-existing-public-image-bucket
R2_PUBLIC_BASE_URL=https://your-public-bucket-domain.example.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
```

Không commit credentials. Backend dùng AWS SDK v3 qua S3-compatible endpoint
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, Region `auto`; R2 tự động mã hóa
file lưu trữ.

- `POST /api/v1/files`: nhận `multipart/form-data` gồm `file` và `folder`.
- `POST /api/v1/users/me/avatar`: upload và tự gắn avatar vào tài khoản hiện tại.
- `GET /api/v1/files/access-url?objectKey=...`: trả URL public của tệp.
- `avatars`, `logos`: jpg/jpeg/png/gif/webp, tối đa 5 MB.
- `documents`: pdf/doc/docx/xls/xlsx, tối đa 10 MB.

Luôn lưu `objectKey` vào dữ liệu nghiệp vụ. URL trả về được dựng từ
`R2_PUBLIC_BASE_URL` và không hết hạn. Không đưa access key hoặc secret key sang frontend.

---

## 7. Danh mục tỉnh/thành phố và phường/xã

Migration `010_create_location_catalog` tạo hai bảng `provinces`, `wards` và seed
snapshot gồm 34 tỉnh/thành phố, 3.321 phường/xã theo danh mục sau tháng 7/2025.
Mã tỉnh gồm 2 chữ số và mã phường/xã gồm 5 chữ số; các bảng nghiệp vụ tiếp tục lưu
các mã này trong `province_id`, `ward_id`.

- `GET /api/v1/locations/provinces`: lấy danh sách tỉnh/thành phố.
- `GET /api/v1/locations/provinces/:provinceCode/wards`: lấy phường/xã theo tỉnh.

Hai API này là public và đọc từ database, không gọi dịch vụ bên thứ ba lúc ứng dụng
hoạt động. Khi cần tải danh mục mới từ Province Open API v2 để chuẩn bị cập nhật:

```bash
npm run locations:refresh
```

Lệnh trên tạo file `vietnam-locations.latest.json`. Hãy kiểm tra dữ liệu rồi tạo một
migration và snapshot có phiên bản mới trước khi triển khai; không chỉnh sửa snapshot
`vietnam-locations-2025-07.json` của migration `010` đã chạy.
