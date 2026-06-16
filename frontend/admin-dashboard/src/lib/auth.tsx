'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@rafeeq/shared';
import { api, setUnauthorizedHandler, tokenStore } from './api';

type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: Status;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    (async () => {
      const token = tokenStore.get();
      if (!token) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const me = await api.auth.me();
        setUser(me);
        setStatus('authenticated');
      } catch {
        signOut();
      }
    })();
  }, [signOut]);

  const login = useCallback(async (phone: string, password: string) => {
    const result = await api.auth.login({ phone, password, device_name: 'admin-dashboard' });
    tokenStore.set(result.token);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    signOut();
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
