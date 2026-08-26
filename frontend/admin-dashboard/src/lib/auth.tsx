'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@rafeeq/shared';
import { api, session, setUnauthorizedHandler } from './api';

type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: Status;
  /** Returns 'mfa' when a second factor is required (challenge held in memory). */
  login: (email: string, password: string) => Promise<'ok' | 'mfa'>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * There is no token in this file, and that is the point.
 *
 * It used to hold one in `localStorage`, readable by any script on the origin. The
 * credential now lives in an `httpOnly` cookie set by `/api/session`, and requests
 * carry it through the server-side proxy. This provider tracks only whether a
 * session exists and who it belongs to.
 *
 * The MFA challenge token IS held in memory between the two login steps. That is
 * deliberate and safe: a challenge cannot act on the platform, it expires quickly,
 * and it never reaches storage.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const signOut = useCallback(() => {
    setUser(null);
    setMfaToken(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    (async () => {
      // Ask the server whether a session cookie exists — the client cannot see it.
      if (!(await session.exists())) {
        setStatus('unauthenticated');

        return;
      }
      try {
        const me = await api.auth.me();
        setUser(me);
        setStatus('authenticated');
      } catch {
        await session.logout();
        signOut();
      }
    })();
  }, [signOut]);

  const login = useCallback(async (email: string, password: string): Promise<'ok' | 'mfa'> => {
    const result = await session.login(email, password);
    if (result.mfa_required && result.mfa_token) {
      setMfaToken(result.mfa_token);

      return 'mfa';
    }

    // The cookie is already set by the route handler; fetch the profile through the
    // proxy so the shape matches every other read.
    setUser(await api.auth.me());
    setStatus('authenticated');

    return 'ok';
  }, []);

  const verifyMfa = useCallback(
    async (code: string) => {
      if (!mfaToken) throw new Error('لا توجد جلسة تحقق نشطة');
      await session.verifyMfa(mfaToken, code);
      setUser(await api.auth.me());
      setMfaToken(null);
      setStatus('authenticated');
    },
    [mfaToken],
  );

  const logout = useCallback(async () => {
    // The route handler revokes the token upstream and clears the cookie.
    await session.logout();
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
