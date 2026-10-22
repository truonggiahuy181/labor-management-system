import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];
const NO_REFRESH_URLS = ['/auth/login', '/auth/refresh', '/auth/logout'];

// Chuyển về /login, trừ khi đang ở sẵn trang đăng nhập / đăng ký / quên mật khẩu
const redirectToLogin = () => {
  if (!AUTH_PAGES.some((p) => window.location.pathname.startsWith(p))) {
    window.location.href = '/login';
  }
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 20000,
  withCredentials: true,
});

let refreshing: Promise<void> | null = null;
const refreshSession = () => {
  refreshing ??= api.post('/auth/refresh').then(() => undefined).finally(() => { refreshing = null; });
  return refreshing;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status !== 401 || typeof window === 'undefined' || !config) {
      return Promise.reject(error);
    }
    if (!config._retried && !NO_REFRESH_URLS.some((u) => config.url?.startsWith(u))) {
      config._retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch (refreshError) {
        // refresh thất bại → về trang đăng nhập (refresh token hết hạn hoặc bị thu hồi)
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    // 401 từ /auth/login, /auth/refresh, /auth/logout hoặc request đã thử lại 1 lần
    redirectToLogin();
    return Promise.reject(error);
  },
);

export default api;