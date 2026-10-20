// src/hooks/useAuth.tsx
'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, type User } from '@/services/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;                                    // true khi đang hỏi server lúc mở app
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mở app: JS không đọc được cookie httpOnly → luôn hỏi server user là ai
  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((u: User) => setUser(u), []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();          // server xoá cookie
    } finally {
      setUser(null);
    }
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