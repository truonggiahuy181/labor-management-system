// src/services/user.ts
import api from './api';

// Backend bọc mọi response thành { code, message, data } (ResponseInterceptor)
export interface BackendResponse<T> { message: string; success: boolean; code: number; data: T; }
export interface Role { id: number; roleCode: string; roleName: string; isActive: boolean; }

export const roleApi = {
  list: () => api.get<BackendResponse<Role[]>>('/roles').then((r) => r.data.data ?? []),
};
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
  districtId: string | null;
  enterpriseId: number | null;
  createdAt: string;
  updatedAt: string;
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

// ─── Quản trị người dùng (chỉ Quản trị viên) ───

export interface UserFilters {
  fullName?: string;
  username?: string;
  email?: string;
  title?: string;
  roleId?: number;
  isActive?: boolean;
}

export interface Paged<T> { data: T[]; total: number; page: number; pageSize: number; }

// Khớp CreateUserDto của backend; khi sửa thì bỏ username / password
export interface UserBody {
  username: string;            // tối đa 50 ký tự, chỉ chữ, số, _ và -
  password: string;            // tối thiểu 8 ký tự
  fullName: string;            // tối đa 100 ký tự
  email: string;               // tối đa 100 ký tự
  dob?: string;                // 'YYYY-MM-DD'
  gender?: number;             // 0: Nữ, 1: Nam, 2: Khác
  phoneNumber?: string;        // 10–11 chữ số
  title?: string;              // tối đa 100 ký tự
  avatarUrl?: string;          // URL hợp lệ, tối đa 255 ký tự
  provinceId?: string;
  districtId?: string;
  wardId?: string;
  address?: string;            // tối đa 255 ký tự
  roleId: number;
  enterpriseId?: number;
  isActive?: boolean;
}

export type UserUpdate = Partial<Omit<UserBody, 'username' | 'password'>>;

const toPaged = (payload: unknown, pageNumber: number, pageSize: number): Paged<Profile> => {
  if (Array.isArray(payload)) return { data: payload, total: payload.length, page: pageNumber, pageSize };
  const p = (payload ?? {}) as Partial<Paged<Profile>> & { items?: Profile[] };
  const data = Array.isArray(p.data) ? p.data : Array.isArray(p.items) ? p.items : [];
  return { data, total: typeof p.total === 'number' ? p.total : data.length, page: p.page ?? pageNumber, pageSize: p.pageSize ?? pageSize };
};

export const adminUserApi = {
  list: (params: UserFilters & { pageNumber: number; pageSize: number }) =>
    api.get<BackendResponse<Paged<Profile>>>('/users', { params }).then((r) => toPaged(r.data.data, params.pageNumber, params.pageSize)),
  get: (id: number) => api.get<BackendResponse<Profile>>(`/users/${id}`).then((r) => r.data.data),
  create: (body: UserBody) => api.post<BackendResponse<Profile>>('/users', body).then((r) => r.data.data),
  update: (id: number, body: UserUpdate) =>
    api.patch<BackendResponse<Profile>>(`/users/${id}`, body).then((r) => r.data.data),
  resetPassword: (id: number, newPassword: string) =>
    api.patch<BackendResponse<Profile>>(`/users/${id}`, { password: newPassword }).then((r) => r.data.data),
  updateStatus: (id: number, isActive: boolean) =>
    api.patch<BackendResponse<Profile>>(`/users/${id}/status`, { isActive }).then((r) => r.data.data),
};

/** Lấy message lỗi backend trả về (GlobalExceptionFilter) */
export const getErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;