// src/services/auth.ts
import api from './api';
import { mockAuthApi } from './mockAuth';

export interface User { id: string; username: string; email: string; }

export interface RegisterBody {
  companyName: string;
  taxCode: string;
  email: string;
  phone: string;
  username: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  code?: string;     // mã lỗi nghiệp vụ, vd. WRONG_PASSWORD
  message?: string;
}

const realAuthApi = {
  login: (body: { username: string; password: string }) =>
    api.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/login', body).then((r) => r.data),

  register: (body: RegisterBody) =>
    api.post<ApiResponse<null>>('/auth/register', body).then((r) => r.data),

  // Quên mật khẩu bước 1: server gửi mã OTP về email
  forgotPassword: (body: { email: string }) =>
    api.post<ApiResponse<null>>('/auth/forgot-password', body).then((r) => r.data),

  // Quên mật khẩu bước 2: đặt mật khẩu mới bằng OTP
  resetPassword: (body: { email: string; otp: string; newPassword: string }) =>
    api.post<ApiResponse<null>>('/auth/reset-password', body).then((r) => r.data),

  changePassword: (body: { oldPassword: string; newPassword: string }) =>
    api.post<ApiResponse<null>>('/auth/change-password', body).then((r) => r.data),

  me: () => api.get<ApiResponse<User>>('/auth/me').then((r) => r.data),
};

// Kiểu chung cho API thật và API giả: thiếu hàm hoặc sai kiểu là TypeScript báo ngay
export type AuthApi = typeof realAuthApi;

export const authApi: AuthApi =
  process.env.NEXT_PUBLIC_MOCK_API === 'true' ? mockAuthApi : realAuthApi;

/** Lấy mã lỗi khi server trả HTTP 4xx/5xx (axios ném lỗi). HTTP 200 + success:false thì đọc thẳng res.code */
export function getErrorCode(err: unknown): string | undefined {
  const data = (err as { response?: { data?: ApiResponse<unknown> } })?.response?.data;
  return data?.code;
}