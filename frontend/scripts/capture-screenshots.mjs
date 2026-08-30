#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Screenshot the REAL admin dashboard, against a REAL seeded database.

   ── Why a script and not a folder of images somebody dragged in ─────────────

   A screenshot committed by hand is true on the day it is committed. This is
   re-runnable, so the images in `docs/design/screenshots/` can be regenerated after
   any change and a stale one is a `git status` away from being noticed. It is also
   the only honest way to show «the current state»: it renders the code on this
   commit, with data the seeders produce, through a real browser.

   ── Why raw CDP and not Playwright ─────────────────────────────────────────

   Playwright is not a dependency of this repo and should not become one for a docs
   task. Chrome is already present (`/opt/playwright/…/chrome`), it speaks the DevTools
   Protocol over a WebSocket, and `ws` is already in the tree. That is the whole
   client below — about eighty lines, no new dependency, and nothing to keep in step
   with a browser release.

   ── Why the browser logs itself in, rather than being handed a cookie ──────

   The first version of this script called `/api/session` from Node, read the
   `set-cookie` header, and injected it with `Network.setCookie`. Every one of the
   29 files came out byte-identical: the injection silently did not take, so all of
   them were the login screen. Guessing at `domain`/`Secure`/`SameSite` from outside
   the browser is unfalsifiable — you cannot tell a cookie that was rejected from a
   page that simply did not load.

   So the login now happens INSIDE the page, via `Runtime.evaluate` on
   `127.0.0.1:3000/login`. The browser performs the same `fetch` the real UI performs,
   and stores the `httpOnly` cookie itself under exactly the rules it enforces. If the
   credentials are wrong we get the API's own error message back, and the run stops.

   ── Why the viewport, and not the full scrollable page ────────────────────

   `Sidebar` is `fixed inset-y-0 h-screen` and `Topbar` is `sticky top-0`. Under
   `captureBeyondViewport` a fixed element is painted once, at the top, so a tall
   full-page capture would show the navigation for the first 960px and a blank column
   beneath it — a screenshot of a layout bug that does not exist. The viewport is both
   the honest frame and the smaller file.

   ── Usage ─────────────────────────────────────────────────────────────────

   Needs an API on :8000, the dashboard on :3000, and a seeded database. See
   `scripts/screenshots.sh` at the repo root, which starts all three and calls this.

     node scripts/capture-screenshots.mjs
   ═══════════════════════════════════════════════════════════════════════════ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(ROOT, 'docs/design/screenshots/admin');

const DASHBOARD = process.env.DASHBOARD_URL ?? 'http://127.0.0.1:3000';
const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const VIEWPORT = { width: 1440, height: 960 };

/** The unauthenticated screen, captured before the session exists. */
const LOGIN = ['login', '/login', 'تسجيل الدخول'];

/**
 * The pages worth showing, in the order an operator meets them.
 *
 * Every one of these is a real route in `admin-dashboard/app/(dashboard)`, verified
 * against the filesystem — all 28 of them, which is the whole directory. The list is
 * still written out rather than globbed: a screenshot set is an editorial choice about
 * the order a reader should meet the product in, and `drivers/[id]` needs an id that
 * only the seeded data knows.
 */
const PAGES = [
  ['dashboard', '/', 'لوحة القيادة'],
  ['ride-requests', '/ride-requests', 'الطلبات الحيّة'],
  ['trips', '/trips', 'الرحلات'],
  ['drivers', '/drivers', 'الكباتن والتوثيق'],
  ['users', '/users', 'المستخدمون'],
  ['payments', '/payments', 'المدفوعات'],
  ['withdrawals', '/withdrawals', 'السحوبات'],
  ['reports', '/reports', 'التقارير المالية'],
  ['pricing', '/pricing', 'التعرفة والتسعير'],
  ['zone-prices', '/zone-prices', 'مصفوفة أسعار المناطق'],
  ['plans', '/plans', 'الباقات'],
  ['subscriptions', '/subscriptions', 'الاشتراكات'],
  ['coupons', '/coupons', 'الكوبونات'],
  ['routes', '/routes', 'المسارات'],
  ['zones', '/zones', 'المناطق'],
  ['universities', '/universities', 'الجامعات'],
  ['safety', '/safety', 'السلامة و SOS'],
  ['disputes', '/disputes', 'التنازعات'],
  ['complaints', '/complaints', 'الشكاوى'],
  ['support', '/support', 'الدعم'],
  ['notifications', '/notifications', 'الإشعارات والبثّ'],
  ['ads', '/ads', 'الإعلانات'],
  ['cliq', '/cliq', 'إعداد CliQ'],
  ['security', '/security', 'الأمن'],
  ['audit', '/audit', 'سجلّ التدقيق'],
  ['admins', '/admins', 'المدراء والأدوار'],
  ['insights', '/insights', 'التحليلات'],
  ['profile', '/profile', 'ملفّي'],
];

/** A minimal CDP client: one WebSocket, promise per command. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== undefined) {
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        this.pending.delete(msg.id);
        msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
        return;
      }
      for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
    await new Promise((ok, no) => {
      ws.once('open', ok);
      ws.once('error', no);
    });

    return new Cdp(ws);
  }

  send(method, params = {}) {
    const id = ++this.id;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    const list = this.listeners.get(method) ?? [];
    list.push(fn);
    this.listeners.set(method, list);
  }

  /** Resolves on the next `method`, or after `timeout` — whichever comes first. */
  once(method, timeout) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeout);
      this.on(method, () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Run an async expression in the page and return its value.
   *
   * Throws on a page-side exception instead of resolving `undefined`, because a
   * swallowed exception here is how the previous version produced 29 identical files.
   */
  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }

    return result.value;
  }

  close() {
    this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url) {
  const res = await fetch(url);

  return res.json();
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see scripts/screenshots.sh`);

  return value;
}

/** Navigate, wait for load, then settle for the after-mount fetches. */
async function goto(cdp, url, settle = 2200) {
  await cdp.send('Page.navigate', { url });
  await cdp.once('Page.loadEventFired', 15000);
  // The pages fetch after mount, so give the tables a beat to arrive. This is the
  // difference between a screenshot of the product and a screenshot of its skeletons.
  await sleep(settle);
}

async function shoot(cdp, slug) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(data, 'base64');
  writeFileSync(resolve(OUT, `${slug}.png`), buffer);

  return buffer;
}

/**
 * Log in from inside the page, so the browser stores its own `httpOnly` cookie.
 * Returns nothing; throws with the server's message if the credentials are refused.
 */
async function signIn(cdp) {
  const payload = JSON.stringify({
    email: required('SEED_ADMIN_EMAIL'),
    password: required('SEED_ADMIN_PASSWORD'),
  });

  const outcome = await cdp.eval(`(async () => {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ${JSON.stringify(payload)},
      credentials: 'same-origin',
    });
    return { status: res.status, body: await res.text() };
  })()`);

  if (outcome.status !== 200) {
    throw new Error(`login refused (${outcome.status}): ${outcome.body}`);
  }
  if (outcome.body.includes('mfa_required')) {
    throw new Error('the seeded admin has two-factor enabled; this script cannot complete it');
  }

  // Verify here, rather than discovering it 28 pages later when a route bounces to
  // /login. A 200 from the login handler only means the credentials were right; it
  // does not mean the browser kept the cookie.
  const established = await cdp.eval(`(async () => {
    const r = await fetch('/api/session', { cache: 'no-store' });
    return (await r.json()).authenticated === true;
  })()`);

  if (!established) {
    throw new Error(
      `login returned 200 but no session was established.\n` +
        `  login response body: ${outcome.body}\n${await diagnose(cdp)}`,
    );
  }
}

/**
 * Explain a rejected session instead of merely reporting one.
 *
 * "The session is not being accepted" has at least three causes that look identical
 * from outside — the cookie was never stored, it was stored but not sent, or it was
 * sent and the API refused the token. This distinguishes them: the cookie jar answers
 * the first two, `GET /api/session` answers the third.
 */
async function diagnose(cdp) {
  const lines = [];

  try {
    const { cookies } = await cdp.send('Network.getAllCookies');
    lines.push(
      cookies.length === 0
        ? '  cookie jar: EMPTY — the Set-Cookie was rejected by the browser.'
        : `  cookie jar: ${cookies
            .map((c) => `${c.name} (domain=${c.domain} secure=${c.secure} httpOnly=${c.httpOnly})`)
            .join(', ')}`,
    );
    if (cookies.some((c) => c.secure)) {
      lines.push(
        '  a Secure cookie over plain http is only stored for a trustworthy origin;' +
          ' NODE_ENV=production makes the session cookie Secure (src/lib/session.ts).',
      );
    }
  } catch (e) {
    lines.push(`  cookie jar: unreadable (${e.message})`);
  }

  try {
    lines.push(
      `  GET /api/session → ${await cdp.eval(
        `(async () => {
          const r = await fetch('/api/session', { cache: 'no-store' });
          return r.status + ' ' + (await r.text());
        })()`,
      )}`,
    );
  } catch (e) {
    lines.push(`  GET /api/session: failed (${e.message})`);
  }

  return lines.join('\n');
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const target = await json(`${CDP}/json/new?about:blank`).catch(() =>
    fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json()),
  );
  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable'); // for the cookie jar in diagnose()
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    ...VIEWPORT,
    // 1, not 2. At 2 the files were 4.6 MB each — a docs image nobody can load in a
    // browser tab is not documentation.
    deviceScaleFactor: 1,
    mobile: false,
  });

  const written = [];

  // ── the login screen, before there is a session ──────────────────────────
  const [loginSlug, loginPath, loginTitle] = LOGIN;
  await goto(cdp, `${DASHBOARD}${loginPath}`);
  written.push({
    slug: loginSlug,
    path: loginPath,
    title: loginTitle,
    bytes: (await shoot(cdp, loginSlug)).length,
  });
  console.log(`  ✓ ${loginPath.padEnd(16)} → ${loginSlug}.png`);

  // ── sign in, from inside that same page ──────────────────────────────────
  await signIn(cdp);
  console.log('signed in — the browser holds the session cookie it issued itself');

  for (const [slug, path, title] of PAGES) {
    await goto(cdp, `${DASHBOARD}${path}`);

    // A client-gated page redirects to /login when the cookie did not take. Without
    // this check the run "succeeds" and commits 28 copies of the login screen.
    const landed = await cdp.eval('location.pathname');
    if (landed === '/login') {
      throw new Error(
        `${path} bounced to /login — the session is not being accepted.\n${await diagnose(cdp)}`,
      );
    }

    const buffer = await shoot(cdp, slug);
    written.push({ slug, path, title, bytes: buffer.length });
    console.log(`  ✓ ${path.padEnd(16)} → ${slug}.png (${(buffer.length / 1024).toFixed(0)} KB)`);
  }

  // Two identical files mean the capture is not tracking navigation. Comparing byte
  // length is a weak hash, but it is exactly the failure that happened before.
  const sizes = new Map();
  for (const page of written) {
    sizes.set(page.bytes, [...(sizes.get(page.bytes) ?? []), page.slug]);
  }
  const collisions = [...sizes.values()].filter((group) => group.length > 1);
  if (collisions.length > 0) {
    throw new Error(`identical screenshots: ${collisions.map((g) => g.join('=')).join(', ')}`);
  }

  writeFileSync(resolve(OUT, 'index.json'), `${JSON.stringify(written, null, 2)}\n`);
  cdp.close();
  console.log(`\n${written.length} screenshots in docs/design/screenshots/admin/`);
}

main().catch((e) => {
  console.error(`capture failed: ${e.message}`);
  process.exit(1);
});
