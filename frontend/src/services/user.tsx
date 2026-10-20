// src/services/user.ts
import api from './api';

// Backend bọc mọi response thành { statusCode, message, data } (ResponseInterceptor)
export interface BackendResponse<T> { statusCode: number; message: string; data: T; }

export interface Profile {
  id: number;
  username: string;
  fullName: string;
  dob: string | null;          // 'YYYY-MM-DD'
  gender: number | null;       // 0: Nữ, 1: Nam, 2: Khác
  email: string | null;
  phoneNumber: string | null;
  title: string | null;
  avatarUrl: string | null;
  provinceId: string | null;
  wardId: string | null;
  address: string | null;
  roleId: number;
  isActive: boolean;
}

// Các trường được phép sửa – khớp UpdateProfileDto của backend
export type ProfileUpdate = Partial<Pick<Profile,
  'fullName' | 'dob' | 'gender' | 'phoneNumber' | 'title' | 'avatarUrl' | 'provinceId' | 'wardId' | 'address'>>;

export const userApi = {
  getMe: () => api.get<BackendResponse<Profile>>('/users/me').then((r) => r.data.data),
  updateMe: (body: ProfileUpdate) => api.patch<BackendResponse<Profile>>('/users/me', body).then((r) => r.data.data),

  // Đổi email 3 bước – các route nằm trong AuthController
  requestEmailChange: () => api.post('/auth/request-email-change'),
  verifyEmailOtp: (otp: string) => api.post('/auth/verify-email-otp', { otp }),
  confirmEmailChange: (body: { newEmail: string; otp: string }) => api.post('/auth/confirm-email-change', body),

  // Backend nhận currentPassword / newPassword / confirmNewPassword
  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    api.post('/auth/change-password', body),
};

/** Lấy message lỗi backend trả về (GlobalExceptionFilter) */
export const getErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;