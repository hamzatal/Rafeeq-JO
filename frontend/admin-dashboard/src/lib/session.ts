/**
 * Server-side session for the admin dashboard.
 *
 * The token used to live in `localStorage`, which means any XSS anywhere in the
 * dashboard — one bad dependency, one unescaped field — could read it and act as a
 * platform administrator: mint wallet balance, approve payouts, unfreeze accounts.
 * `localStorage` is readable by any script on the origin, and no CSP can change
 * that.
 *
 * It now lives in an `httpOnly` cookie that JavaScript cannot read at all, and
 * every API call goes through the proxy in `app/api/proxy/[...path]/route.ts`,
 * which attaches the bearer header server-side. The browser never holds the token.
 */
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'rafeeq_admin_session';

/** Two hours. An admin session is high-privilege; it should not be long-lived. */
export const SESSION_TTL_SECONDS = 60 * 60 * 2;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // `lax` still sends the cookie on top-level navigation but not on cross-site
    // POSTs, which is what mitigates CSRF for a same-origin proxy like this one.
    sameSite: 'lax' as const,
    // Not forced in development, where the dashboard runs on plain HTTP.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Read the bearer token on the server. Returns null when unauthenticated. */
export function readToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

/** The upstream Laravel API. Server-side only, so it is not a NEXT_PUBLIC value. */
export function upstreamBase(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8000'
  ).replace(/\/$/, '');
}
