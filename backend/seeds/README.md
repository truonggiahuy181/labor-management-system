# Dữ liệu mẫu

Các seed trong dự án chỉ dùng cho môi trường development.

Khi `NODE_ENV=development` và `SEED_SAMPLE_DATA=true`, backend tự tạo dữ liệu mẫu lúc khởi động. Seed có thể chạy lại an toàn: các bản ghi có cùng mã hoặc username sẽ không bị nhân đôi.

## Dữ liệu được tạo

- Danh mục vai trò: `ADMIN`, `ENTERPRISE_USER`.
- 5 loại hình doanh nghiệp.
- Cây ngành nghề kinh doanh đủ cấp 1-4 cho các ngành doanh nghiệp mẫu sử dụng.
  Mã cấp 2-4 được lưu kèm tiền tố chữ cái của cấp 1, ví dụ
  `J → J62 → J620 → J6201`. Trong đó `J6209` là ngành active chưa được sử dụng; `J6312` và nhánh
  `T → T97 → T970 → T9700` inactive để kiểm thử quy tắc trạng thái.
- Mặc định 30 doanh nghiệp có tên riêng, loại hình và ngành nghề phù hợp, gồm cả trạng thái hoạt động và ngừng hoạt động.
- Một tài khoản cho mỗi doanh nghiệp mẫu, đủ dữ liệu để kiểm thử nhiều trang với `pageSize=10`.
- Một tài khoản quản trị mẫu.
- 12 kỳ báo cáo thuộc nhiều loại, năm và trạng thái khác nhau.
- 9 yếu tố gây chấn thương mẫu.
- Danh mục 34 tỉnh/thành và 3.321 phường/xã được migration `010_create_location_catalog` nạp sẵn; seed doanh nghiệp sử dụng trực tiếp các mã này.

Số lượng doanh nghiệp/tài khoản có thể đổi bằng `SEED_PAGINATION_RECORDS` (tối đa 100).

## Tài khoản đăng nhập

Tài khoản quản trị:

- Username: `admin_demo`
- Password: `Admin@123456`

Tài khoản doanh nghiệp:

- Username: mã số thuế từ `0990000001` đến `0990000030`.
- Password chung: `12345678`.

Các giá trị trên có thể đổi qua biến môi trường trong `.env`.

## Chạy seed

Đảm bảo migration đã chạy, sau đó khởi động backend:

```powershell
npm run start:dev
```

Không sử dụng mật khẩu mẫu ở production. Seed luôn bị bỏ qua khi `NODE_ENV` khác `development`.

File `001_user_example.sql` chỉ được giữ lại cho trường hợp cần tạo riêng tài khoản admin bằng PostgreSQL CLI.
