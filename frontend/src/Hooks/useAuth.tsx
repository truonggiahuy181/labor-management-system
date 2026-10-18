// src/hooks/useAuth.tsx
'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { tokenStorage } from '@/services/api';
import { authApi, type User } from '@/services/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;                                    // true khi đang kiểm tra token lúc mở app
  login: (token: string, user: User, remember?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mở app: có token thì hỏi server user là ai
  useEffect(() => {
    if (!tokenStorage.get()) { setLoading(false); return; }
    authApi.me()
      .then((res) => { if (res.success) setUser(res.data); })
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, u: User, remember = true) => {
    tokenStorage.clear();              // tránh còn token cũ ở kho còn lại
    tokenStorage.set(token, remember);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}