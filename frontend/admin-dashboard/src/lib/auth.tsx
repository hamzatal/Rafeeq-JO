'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@rafeeq/shared';
import { api, setUnauthorizedHandler, tokenStore } from './api';

type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: Status;
  /** Returns 'mfa' when a second factor is required (challenge stored). */
  login: (email: string, password: string) => Promise<'ok' | 'mfa'>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setMfaToken(null);
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

  const login = useCallback(async (email: string, password: string): Promise<'ok' | 'mfa'> => {
    const result = await api.auth.login({ email, password, device_name: 'admin-dashboard' });
    if (result.mfa_required) {
      setMfaToken(result.mfa_token);
      return 'mfa';
    }
    tokenStore.set(result.token);
    setUser(result.user);
    setStatus('authenticated');
    return 'ok';
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    if (!mfaToken) throw new Error('لا توجد جلسة تحقق نشطة');
    const result = await api.auth.verifyMfa({ mfa_token: mfaToken, code, device_name: 'admin-dashboard' });
    tokenStore.set(result.token);
    setUser(result.user);
    setMfaToken(null);
    setStatus('authenticated');
  }, [mfaToken]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    signOut();
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ user, status, login, verifyMfa, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
