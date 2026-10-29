// src/services/text.ts
// Xử lý khoảng trắng cho ô nhập:
//   - ô không được có khoảng trắng (tên đăng nhập, mã số thuế, email, số điện thoại) → vẫn cho gõ, rời ô thì bỏ hết
//   - ô chữ tự do (họ tên, tên doanh nghiệp, địa chỉ…) → chỉ bỏ ở đầu / cuối khi gửi, không cho toàn dấu cách

/** Bỏ mọi khoảng trắng: "0101 234 567 " → "0101234567" */
export const stripSpaces = (value: string) => value.replace(/\s/g, '');

/** Còn chữ sau khi bỏ khoảng trắng đầu / cuối (dùng cho ô bắt buộc: "   " không hợp lệ) */
export const notBlank = (value: unknown) => String(value ?? '').trim() !== '';
