/**
 * Establishes and destroys the admin session cookie.
 *
 * The token is issued by Laravel. This handler is the only place it is ever held,
 * and it puts it straight into an `httpOnly` cookie so the browser never sees it.
 * The client posts credentials here instead of to the API directly, and gets back
 * the user — never the token.
 *
 * Two-factor is handled by returning the challenge to the client. An MFA token is
 * a short-lived challenge, not a credential that can act on the platform, so it is
 * safe for the client to hold between the two steps.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions, readToken, upstreamBase } from '@/lib/session';

async function callApi(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${upstreamBase()}/api/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  return { res, json: await res.json().catch(() => ({})) };
}

/** POST — log in, or complete a two-factor challenge. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const isMfaStep = typeof body?.mfa_token === 'string' && typeof body?.code === 'string';
  const { res, json } = isMfaStep
    ? await callApi('v1/auth/mfa/verify', { mfa_token: body.mfa_token, code: body.code })
    : await callApi('v1/auth/login', {
        email: body?.email,
        password: body?.password,
        device_name: 'admin-dashboard',
      });

  if (!res.ok) {
    return NextResponse.json(json, { status: res.status });
  }

  const data = json?.data ?? json;

  // Still mid-challenge: no session yet, and nothing to store.
  if (data?.mfa_required) {
    return NextResponse.json({ mfa_required: true, mfa_token: data.mfa_token });
  }

  if (typeof data?.token !== 'string') {
    return NextResponse.json({ message: 'استجابة غير متوقّعة من الخادم.' }, { status: 502 });
  }

  // The client is told about the user only. The token stops here.
  const out = NextResponse.json({ user: data.user ?? null });
  out.cookies.set(SESSION_COOKIE, data.token, sessionCookieOptions());

  return out;
}

/** DELETE — log out. Revokes the token upstream, then clears the cookie either way. */
export async function DELETE() {
  const token = readToken();
  if (token) {
    await callApi('v1/auth/logout', {}, token).catch(() => null);
  }

  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });

  return out;
}

/** GET — is there a session? Used on boot instead of reading a token. */
export async function GET() {
  return NextResponse.json({ authenticated: readToken() !== null });
}

export const dynamic = 'force-dynamic';
