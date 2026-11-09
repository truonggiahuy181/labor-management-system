# Checklist hoàn thành dự án

> Cập nhật gần nhất: 09/11/2026
> Branch đang làm việc: `feat/seed-reference-catalogs-2025`
> Commit gần nhất: `8edf29a feat(seed): add official reference catalogs`

## Quy ước theo dõi

- `[ ]`: Chưa hoàn thành.
- `[x]`: Đã hoàn thành và có thể kiểm chứng.
- Mỗi lần cập nhật, ghi thêm kết quả vào phần **Lịch sử cập nhật** cuối file.
- Với task chưa rõ người thực hiện hoặc thời hạn, bổ sung theo mẫu: `— Owner: ... — Deadline: ...`.

## Trạng thái kiểm chứng hiện tại

- [x] Backend build thành công.
- [x] Backend unit test: 47 test file, 380 test đều đạt.
- [x] Backend lint chạy thành công, còn 3 cảnh báo cần dọn.
- [x] Frontend production build thành công, tạo đủ 26 route.
- [x] Frontend lint chạy thành công, còn 2 cảnh báo cần dọn.
- [x] Backend E2E test đạt: 3 test kiểm tra route bảo vệ, location catalog và đăng nhập bằng cookie.
- [x] PostgreSQL và Redis chạy bằng Docker, trạng thái `healthy`.
- [x] Migration `InitialSchema1800000000000` chạy được trên database sạch.

## P0 — Blocker trước khi bàn giao

### 1. Git và tích hợp thay đổi

- [x] Tạo branch `feat/seed-reference-catalogs-2025`.
- [x] Commit phần catalog/seed với commit `8edf29a`.
- [ ] Push branch lên remote.
- [ ] Tạo pull request, review và merge.
- [ ] Xử lý file untracked `Screenshot 2026-11-08 191852.png`: xóa, commit đúng mục đích hoặc thêm vào `.gitignore`.

### 2. Bảo mật thông tin cấu hình

- [x] Thay toàn bộ giá trị giống thông tin thật trong `backend/.env.example` bằng placeholder.
- [ ] Đổi thông tin DB/SMTP nếu các giá trị trong file mẫu từng được sử dụng thực tế.
- [ ] Quét secret trong working tree và toàn bộ lịch sử Git.
- [x] Bảo đảm `.env` thật không được Git theo dõi.
- [ ] Ghi rõ quy trình cấp và thay đổi secret cho production.

### 3. Khởi tạo database và dữ liệu bắt buộc

- [x] Reset database Docker và chạy initial migration thành công.
- [x] Seed 863 ngành kinh tế cấp 1–4.
  - [x] Level 1: 22 bản ghi.
  - [x] Level 2: 87 bản ghi.
  - [x] Level 3: 259 bản ghi.
  - [x] Level 4: 495 bản ghi.
- [x] Tạo catalog và CLI seed cho 5 loại hình kinh doanh.
- [x] Tạo catalog và CLI seed cho 717 nghề nghiệp cấp 1–4.
- [x] Chạy và xác minh seed loại hình kinh doanh trên database sạch.
- [x] Chạy và xác minh seed nghề nghiệp trên database sạch.
- [x] Seed 34 tỉnh/thành và 3.321 phường/xã từ snapshot có phiên bản.
- [x] Thiết kế bootstrap roles bắt buộc, không phụ thuộc `SEED_SAMPLE_DATA`.
- [x] Thiết kế cách tạo admin ban đầu riêng với dữ liệu mẫu.
- [x] Xác minh tất cả seed chạy lại nhiều lần mà không nhân đôi dữ liệu.
- [x] Tạo `npm run db:setup` để chạy migration và kiểm chứng toàn bộ reference data.

### 4. Tích hợp catalog thật vào frontend

- [x] Xóa dữ liệu loại hình và ngành hard-code trong `frontend/src/Components/BusinessRegister/options.ts`.
- [x] Lấy loại hình kinh doanh từ API.
- [x] Lấy cây ngành cấp 1–4 từ API và chỉ cho chọn ngành cấp 4.
- [x] Lấy tỉnh/thành và phường/xã từ API.
- [x] Loại bỏ fallback mã loại hình `CP`; frontend dùng ID từ catalog `CTCP` của backend.
- [x] Loại bỏ các mã ngành hard-code cũ, ví dụ `6201`.
- [x] Bổ sung trạng thái loading, retry và thông báo lỗi khi tải catalog.
- [ ] Xác nhận yêu cầu nghiệp vụ: chỉ đăng ký tại TP.HCM hay được chọn toàn quốc.
- [ ] Kiểm thử form đăng ký và form admin tạo doanh nghiệp bằng dữ liệu thật.

### 5. Sửa và mở rộng E2E test

- [x] Tạo database riêng cho E2E test qua `TEST_DB_NAME`.
- [x] Sửa cách TypeORM nạp entity/migration khi Vitest chạy mã TypeScript.
- [x] Không để E2E tự dùng database development hiện tại.
- [ ] Reset hoặc rollback dữ liệu giữa các test.
- [x] Sửa cleanup để không gọi `app.close()` khi ứng dụng khởi tạo thất bại.
- [ ] Kiểm thử E2E đăng ký, đăng xuất và quên/đổi mật khẩu.
- [x] Kiểm thử E2E đăng nhập bằng HttpOnly cookie và đọc người dùng hiện tại.
- [ ] Kiểm thử E2E phân quyền admin/doanh nghiệp.
- [ ] Kiểm thử E2E CRUD doanh nghiệp.
- [ ] Kiểm thử E2E quy trình tạo, gửi, tiếp nhận và trả lại báo cáo tai nạn lao động.
- [ ] Kiểm thử E2E upload/download tài liệu.
- [x] Đưa `npm run test:e2e` về trạng thái pass ổn định.

## P1 — Sẵn sàng phát hành

### 6. Kiểm thử frontend

- [ ] Chọn và cấu hình framework test frontend.
- [ ] Thêm script test vào `frontend/package.json`.
- [ ] Test form đăng ký doanh nghiệp.
- [ ] Test cây chọn ngành cấp 1–4.
- [ ] Test phân quyền và điều hướng theo vai trò.
- [ ] Test form báo cáo tai nạn lao động.
- [ ] Test xử lý lỗi API và phiên đăng nhập hết hạn.

### 7. Dọn cảnh báo và nợ kỹ thuật

- [ ] Xóa hai biến không sử dụng trong `backend/src/modules/auth/auth.service.ts`.
- [ ] Dọn object spread dư thừa trong `backend/src/modules/enterprise/enterprise.service.ts`.
- [ ] Xử lý `confirmPassword` không sử dụng ở trang signup.
- [ ] Thay `window.location.href` bằng cơ chế điều hướng của Next.js.
- [ ] Thay `vite-tsconfig-paths` bằng `resolve.tsconfigPaths` nếu phù hợp phiên bản Vite hiện tại.
- [ ] Giải quyết cảnh báo nhiều `package-lock.json` hoặc cấu hình `turbopack.root`.
- [ ] Chạy lại build, lint và toàn bộ test sau khi dọn.

### 8. CI/CD và đóng gói triển khai

- [ ] Tạo CI pipeline cho backend build, lint, unit test và E2E.
- [ ] Tạo CI pipeline cho frontend build, lint và test.
- [ ] Thêm bước chạy migration trên PostgreSQL sạch trong CI.
- [ ] Thêm secret scan và dependency audit vào CI.
- [ ] Tạo Dockerfile production cho backend.
- [ ] Tạo Dockerfile production cho frontend.
- [ ] Tạo cấu hình triển khai hoặc compose production.
- [ ] Xác định quy trình rollback ứng dụng và migration.

### 9. Cấu hình production

- [ ] Tạo `frontend/.env.example`.
- [ ] Validate biến môi trường bắt buộc khi backend khởi động.
- [ ] Cấu hình JWT secret đủ mạnh và không dùng giá trị mặc định.
- [ ] Cấu hình CORS đúng domain production.
- [ ] Bật HTTPS và cookie `Secure`/`SameSite` phù hợp.
- [ ] Cấu hình PostgreSQL và Redis production.
- [ ] Cấu hình SMTP và kiểm tra gửi OTP/email.
- [ ] Cấu hình Cloudflare R2 và kiểm tra upload/truy cập file.

### 10. Kiểm thử tích hợp và UAT

- [ ] Smoke test API trên môi trường staging.
- [ ] Kiểm thử Redis khi restart hoặc mất kết nối.
- [ ] Kiểm thử giới hạn dung lượng và định dạng file upload.
- [ ] Kiểm thử luồng admin quản lý người dùng, doanh nghiệp và danh mục.
- [ ] Kiểm thử luồng doanh nghiệp lập và gửi báo cáo.
- [ ] Kiểm tra in/xuất báo cáo trên các trình duyệt hỗ trợ.
- [ ] Kiểm tra responsive và khả năng sử dụng trên màn hình nhỏ.
- [ ] Nghiệm thu nghiệp vụ với người dùng đại diện.

## P2 — Vận hành và bàn giao

### 11. Quan sát và khôi phục hệ thống

- [ ] Bổ sung health check cho backend, PostgreSQL, Redis và R2.
- [ ] Chuẩn hóa structured logging và che dữ liệu nhạy cảm.
- [ ] Cấu hình monitoring và cảnh báo lỗi.
- [ ] Viết và kiểm thử quy trình backup PostgreSQL.
- [ ] Viết và kiểm thử quy trình restore PostgreSQL.
- [ ] Xác định chính sách lưu trữ và xóa tài liệu trên R2.

### 12. Tài liệu bàn giao

- [ ] Cập nhật hướng dẫn cài đặt từ máy sạch.
- [ ] Tài liệu hóa migration và seed cho từng môi trường.
- [ ] Tài liệu hóa toàn bộ biến môi trường.
- [ ] Tài liệu hóa roles và ma trận phân quyền.
- [ ] Hoàn thiện tài liệu API/Swagger.
- [ ] Viết runbook triển khai, rollback, backup và xử lý sự cố.
- [ ] Ghi lại tài khoản, quyền truy cập và người tiếp nhận khi bàn giao.

## Definition of Done

Dự án được xem là hoàn thành khi tất cả điều kiện dưới đây đạt:

- [ ] Một máy/môi trường mới có thể cài đặt dự án theo tài liệu mà không cần bước ngầm.
- [ ] Migration và seed chạy thành công trên database trống.
- [ ] Backend/frontend build và lint thành công, không còn cảnh báo cần xử lý.
- [ ] Unit, integration và E2E test đều pass trong CI.
- [ ] Các luồng nghiệp vụ chính đã được UAT và xác nhận.
- [ ] Không còn secret thật trong source code hoặc lịch sử Git có thể truy cập.
- [ ] Staging/production có backup, monitoring và quy trình rollback.
- [ ] Branch tính năng đã được review, merge và phát hành bằng tag/version rõ ràng.

## Lịch sử cập nhật

| Ngày | Nội dung | Người cập nhật |
| --- | --- | --- |
| 09/11/2026 | Tạo checklist; ghi nhận seed ngành 863 bản ghi, build/unit test đạt và E2E đang thất bại. | Codex |
| 09/11/2026 | P0: làm sạch env mẫu; thêm `db:setup`, roles/location/reference seed và admin bootstrap; bỏ catalog hard-code; E2E dùng database riêng và đạt 3/3. | Codex |
