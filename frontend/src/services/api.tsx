// src/services/api.ts
import axios from 'axios';

export const TOKEN_KEY = 'accessToken';
const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];

// "Nhớ đăng nhập": bật → localStorage (giữ sau khi đóng trình duyệt), tắt → sessionStorage (mất khi đóng tab)
export const tokenStorage = {
  get: () =>
    typeof window === 'undefined'
      ? null
      : localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY),
  set: (token: string, remember: boolean) =>
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 20000,
});

// Gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token hết hạn / sai → xoá và đưa về trang đăng nhập (trừ khi đang ở trang login/signup/quên mật khẩu)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      tokenStorage.clear();
      if (!AUTH_PAGES.some((p) => window.location.pathname.startsWith(p))) window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;