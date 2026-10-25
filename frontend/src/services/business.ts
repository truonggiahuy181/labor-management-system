// src/services/business.ts
// API đăng ký tài khoản doanh nghiệp: điền form → xác thực email bằng OTP → xác nhận đăng ký.
// Tên đăng nhập của tài khoản mới = mã số thuế; tài khoản dùng được ngay sau khi xác nhận.
import api from './api';
import type { ApiResponse } from './auth';

export interface BusinessInfo {
  // Thêm mới doanh nghiệp
  companyName: string;
  taxCode: string;
  businessType: string;
  mainIndustry: string;
  licenseDate: string;      // YYYY-MM-DD
  province: string;
  ward: string;
  address: string;
  // Thông tin liên hệ
  foreignName: string;
  email: string;
  officePhone: string;
  leaderName: string;
  leaderPhone: string;
  operatingProvince: string;
  operatingWard: string;
  businessLocation: string;
}

export interface BusinessFiles {
  businessLicense: File | null;  // Giấy phép kinh doanh
  otherDocument: File | null;    // Giấy tờ khác
}

export interface RegisteredAccount { username: string; tempPassword: string; companyName: string; email: string }

export type RegisterBusinessBody = BusinessInfo & BusinessFiles & { verifyToken: string };
export type AdminCreateBusinessBody = BusinessInfo & BusinessFiles;

const toFormData = (body: object) => {
  const form = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value instanceof File) form.append(key, value);
    else if (value !== null && value !== '') form.append(key, String(value));
  });
  return form;
};

const realBusinessApi = {
  // Bước 1 → 2: gửi mã OTP tới email doanh nghiệp (kiểm tra trùng MST/email trước khi gửi)
  sendOtp: (body: { email: string; taxCode: string }) =>
    api.post<ApiResponse<null>>('/auth/register-business/send-otp', body).then((r) => r.data),

  // Bước 2: kiểm tra OTP, server trả token ngắn hạn chứng minh email đã xác thực
  verifyOtp: (body: { email: string; otp: string }) =>
    api.post<ApiResponse<{ verifyToken: string }>>('/auth/register-business/verify-otp', body).then((r) => r.data),

  // Bước 3: gửi toàn bộ hồ sơ + file đính kèm (multipart/form-data)
  register: (body: RegisterBusinessBody) =>
    api.post<ApiResponse<RegisteredAccount>>('/auth/register-business', toFormData(body)).then((r) => r.data),

  // Quản trị viên thêm doanh nghiệp (chỉ Admin): cùng hồ sơ, không cần verifyToken
  adminCreate: (body: AdminCreateBusinessBody) =>
    api.post<ApiResponse<RegisteredAccount>>('/enterprises', toFormData(body)).then((r) => r.data),
};

export type BusinessApi = typeof realBusinessApi;

// ---------- API giả (NEXT_PUBLIC_MOCK_API=true), OTP luôn là 123456 ----------
const MOCK_OTP = '123456';
const delay = <T>(body: ApiResponse<T>) =>
  new Promise<ApiResponse<T>>((resolve) => setTimeout(() => resolve(body), 600));
const fail = (code: string) => delay<never>({ success: false, data: null as never, code });

const mockBusinessApi: BusinessApi = {
  sendOtp: ({ email }) => {
    console.info(`[mock] OTP đăng ký gửi tới ${email}: ${MOCK_OTP}`);
    return delay({ success: true, data: null });
  },
  verifyOtp: ({ otp }) =>
    otp === MOCK_OTP ? delay({ success: true, data: { verifyToken: 'mock-token' } }) : fail('OTP_INVALID'),
  register: ({ taxCode, companyName, email }) =>
    delay({ success: true, data: { username: taxCode, tempPassword: 'Mock1234Aa1', companyName, email } }),
  adminCreate: ({ taxCode, companyName, email }) =>
    delay({ success: true, data: { username: taxCode, tempPassword: 'Mock1234Aa1', companyName, email } }),
};

export const businessApi: BusinessApi =
  process.env.NEXT_PUBLIC_MOCK_API === 'true' ? mockBusinessApi : realBusinessApi;
