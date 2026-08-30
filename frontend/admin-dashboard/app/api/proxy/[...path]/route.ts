/**
 * Same-origin proxy to the Laravel API.
 *
 * Exists so the admin token can live in an `httpOnly` cookie. The browser cannot
 * read that cookie, so it also cannot attach an `Authorization` header — this
 * handler does it server-side instead. The dashboard therefore talks only to its
 * own origin, and the token never enters JavaScript.
 *
 * Everything is forwarded unchanged: method, path, query, body and the headers that
 * matter. The response is returned as-is so error shapes and status codes reach the
 * client exactly as the API produced them.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, readToken, upstreamBase } from '@/lib/session';

/** Request headers worth forwarding. Hop-by-hop and host headers must not be. */
const FORWARD_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language', 'x-requested-with'];
const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'cache-control'];

async function forward(req: NextRequest, path: string[]) {
  const token = readToken();
  const search = req.nextUrl.search;
  /*
   | The captured path is the COMPLETE upstream path — it already begins `api/v1`,
   | because the shared client builds its own baseURL as `<base>/api/<API_VERSION>`
   | (packages/api-client/src/client.ts:114) and the base it is given here is
   | `/api/proxy`. So the browser asks for `/api/proxy/api/v1/auth/me`.
   |
   | This used to prepend `/api/` as well, which produced `<upstream>/api/api/v1/…`
   | and a 404 on EVERY authenticated request. That failure was invisible in the test
   | suite, which mocks the client, and self-concealing in the browser: `AuthProvider`
   | treats a failed `auth.me()` as a dead session and calls `session.logout()`, so
   | the cookie was deleted and the only symptom was an instant bounce back to
   | /login — indistinguishable from bad credentials. Nothing in the dashboard worked.
   */
  const url = `${upstreamBase()}/${path.map(encodeURIComponent).join('/')}${search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const hasBody = !['GET', 'HEAD'].includes(req.method);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك ثم أعد المحاولة.' },
      { status: 502 },
    );
  }

  const out = new NextResponse(upstream.body, { status: upstream.status });
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.headers.set(name, value);
  }

  // A rejected token is a dead session: clear the cookie so the client stops
  // retrying with it and the login screen is reached in one step.
  if (upstream.status === 401 && token) {
    out.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  }

  return out;
}

type Ctx = { params: { path: string[] } };

export const GET = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const POST = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PUT = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PATCH = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const DELETE = (req: NextRequest, { params }: Ctx) => forward(req, params.path);

export const dynamic = 'force-dynamic';
