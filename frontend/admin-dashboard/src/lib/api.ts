import { createRafeeqApi } from '@rafeeq/api-client';

/**
 * The dashboard talks only to its own origin.
 *
 * The admin token used to sit in `localStorage`, where any script on the page could
 * read it — one bad dependency or one unescaped field away from someone acting as a
 * platform administrator: minting wallet balance, approving payouts, unfreezing
 * accounts. No CSP prevents that, because `localStorage` is readable by design.
 *
 * It now lives in an `httpOnly` cookie that JavaScript cannot touch, and requests
 * go through `/api/proxy/*`, a Next route handler that attaches the bearer header
 * server-side. So there is no `getToken` here any more: there is nothing for the
 * browser to get. See src/lib/session.ts and app/api/proxy.
 */
const PROXY_BASE = '/api/proxy';

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

const readLocale = (): 'ar' | 'en' =>
  typeof window !== 'undefined' && localStorage.getItem('rafeeq_admin_locale') === 'en' ? 'en' : 'ar';

export const api = createRafeeqApi({
  baseURL: PROXY_BASE,
  // The proxy holds the credential. Returning null keeps the client from adding an
  // Authorization header the browser could never populate correctly anyway.
  getToken: () => null,
  getLocale: readLocale,
  onUnauthorized: () => onUnauthorized?.(),
});

/**
 * Session endpoints. These are the only calls that are not proxied, because they
 * are what writes and clears the cookie.
 */
export const session = {
  /** Log in. Resolves to an MFA challenge when a second factor is required. */
  async login(email: string, password: string) {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message ?? 'فشل تسجيل الدخول.');

    return json as { user?: unknown; mfa_required?: boolean; mfa_token?: string };
  },

  /** Complete a two-factor challenge. */
  async verifyMfa(mfaToken: string, code: string) {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message ?? 'رمز التحقق غير صحيح.');

    return json as { user?: unknown };
  },

  async logout() {
    await fetch('/api/session', { method: 'DELETE' }).catch(() => null);
  },

  /** Is a session cookie present? Used on boot in place of reading a token. */
  async exists(): Promise<boolean> {
    try {
      const res = await fetch('/api/session', { cache: 'no-store' });
      const json = await res.json();

      return Boolean(json?.authenticated);
    } catch {
      return false;
    }
  },
};
