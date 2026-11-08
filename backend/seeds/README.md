# Dữ liệu mẫu

Dữ liệu doanh nghiệp và tài khoản mẫu chỉ dùng cho môi trường development.
Danh mục ngành là dữ liệu tham chiếu và có lệnh seed riêng cho từng môi trường.

Khi `NODE_ENV=development` và `SEED_SAMPLE_DATA=true`, backend tự tạo dữ liệu mẫu lúc khởi động. Seed có thể chạy lại an toàn: các bản ghi có cùng mã hoặc username sẽ không bị nhân đôi.

## Dữ liệu được tạo

- Danh mục vai trò: `ADMIN`, `ENTERPRISE_USER`.
- 5 loại hình doanh nghiệp: công ty TNHH một thành viên, công ty TNHH hai thành viên trở lên,
  công ty cổ phần, công ty hợp danh và doanh nghiệp tư nhân.
- Danh mục 717 nghề nghiệp cấp 1-4, gồm 10 mã cấp 1, 48 mã cấp 2, 152 mã cấp 3 và
  507 mã cấp 4. Các mã cấp 5 một-một trong tệp nguồn được thu gọn vào mã cấp 4 tương ứng.
- Danh mục 863 ngành kinh tế Việt Nam cấp 1-4, gồm 22 mã cấp 1, 87 mã cấp 2,
  259 mã cấp 3 và 495 mã cấp 4. Mã ngành được lưu theo mã chính thức, ví dụ
  `K → 62 → 621 → 6219`.
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

Để chỉ nạp danh mục ngành cấp 1-4 mà không tạo doanh nghiệp hoặc tài khoản mẫu:

```powershell
npm run seed:industries
```

Lệnh này có thể chạy lại an toàn: bản ghi được upsert theo mã ngành và quan hệ cha-con
được kiểm tra sau khi nạp.

Để chỉ nạp 5 loại hình kinh doanh:

```powershell
npm run seed:business-types
```

Để chỉ nạp danh mục nghề nghiệp cấp 1-4:

```powershell
npm run seed:occupations
```

Hai lệnh trên cũng có thể chạy lại an toàn: dữ liệu được upsert theo mã và được kiểm tra sau khi nạp.

File `001_user_example.sql` chỉ được giữ lại cho trường hợp cần tạo riêng tài khoản admin bằng PostgreSQL CLI.
