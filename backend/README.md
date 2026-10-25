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
*(Nếu cần, chỉnh sửa cổng hoặc mật khẩu trong file `.env`)*

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

---

## 5. Chạy kiểm thử tự động (Unit Test)

```bash
# Chạy riêng các bài test của module user
npx vitest run src/modules/user

# Chạy toàn bộ test trong dự án
npm test
```
