#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Screenshot ALL THREE apps, against a REAL seeded database.

   ── Why a script and not a folder of images somebody dragged in ─────────────

   A screenshot committed by hand is true on the day it is committed. This is
   re-runnable, so the images in `docs/design/screenshots/` can be regenerated after
   any change and a stale one is a `git status` away from being noticed. It is also
   the only honest way to show «the current state»: it renders the code on this
   commit, with data the seeders produce, through a real browser.

   ── Why raw CDP and not Playwright ─────────────────────────────────────────

   Playwright is not a dependency of this repo and should not become one for a docs
   task. Chrome is already present, it speaks the DevTools Protocol over a WebSocket,
   and `ws` is already in the tree. That is the whole client below — no new dependency
   and nothing to keep in step with a browser release.

   ── Two different ways in, because the apps store the token differently ────

   The dashboard keeps its token in an `httpOnly` cookie, so the BROWSER has to log in
   itself: a `fetch('/api/session')` evaluated inside the page. An earlier version
   called the endpoint from Node and injected the cookie with `Network.setCookie`,
   which silently did not take and produced 29 byte-identical files.

   The two Expo apps keep it in `localStorage` on web (`packages/ui/src/runtime/
   storage.ts` branches on `Platform.OS === 'web'`), which JavaScript CAN write. So
   for those we take a token from the API and write it into the key the app reads,
   then reload so the app bootstraps with a session.

   ── Why the phones are captured at 390×844 ────────────────────────────────

   That is an iPhone 14 viewport, `deviceScaleFactor: 2`, `mobile: true` — so the
   layout takes its phone branch and the Arabic type is legible in the committed PNG.
   The dashboard stays at 1440×960 at scale 1: at 2 the files were 4.6 MB each.

   ── Usage ─────────────────────────────────────────────────────────────────

   See `scripts/screenshots.sh` at the repo root, which starts Postgres, seeds it,
   serves the API, builds all three front-ends, serves them, and calls this.
   ═══════════════════════════════════════════════════════════════════════════ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_BASE = resolve(ROOT, 'docs/design/screenshots');

const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const API = process.env.API_URL ?? 'http://127.0.0.1:8000';
const DASHBOARD = process.env.DASHBOARD_URL ?? 'http://127.0.0.1:3000';
const STUDENT = process.env.STUDENT_URL ?? 'http://127.0.0.1:4001';
const DRIVER = process.env.DRIVER_URL ?? 'http://127.0.0.1:4002';

const DESKTOP = { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };

/**
 * The three front-ends, and the pages worth showing in each.
 *
 * `public` pages are captured before signing in; `private` ones after. Splitting them
 * is not cosmetic: an authenticated app REDIRECTS away from the auth screens, so
 * `/login` has to be photographed while there is still no session, and `/home` only
 * once there is one.
 *
 * Expo Router group folders — `(app)`, `(auth)`, `(onboarding)` — do not appear in the
 * URL, which is why these paths look flat next to the file tree.
 */
const TARGETS = [
  {
    name: 'admin-dashboard',
    dir: 'admin',
    base: DASHBOARD,
    metrics: DESKTOP,
    auth: 'cookie',
    settle: 2200,
    public: [
      ['login', '/login', 'تسجيل الدخول'],
    ],
    private: [
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
    ],
  },
  {
    name: 'student-app',
    dir: 'student',
    base: STUDENT,
    metrics: PHONE,
    auth: 'localStorage',
    storageKey: 'rafeeq_token',
    /*
     | Seeded by DemoSeeder::seedStudents — '+96279' + (100000 + i).
     |
     | Index 1, not 0. `status` is `$i % 7 === 0 ? Suspended : Active`, so student 0 is
     | the suspended one and the API answers ACCOUNT_SUSPENDED. Index 1 is also the
     | better subject: `$i % 3 !== 0` gives it an active subscription and its wallet
     | holds 5 000 fils, so the wallet and subscription screens show real state
     | instead of an empty one.
     */
    login: { phone: '+962790100001' },
    settle: 3000,
    public: [
      ['01-intro', '/intro', 'الترحيب والتعريف'],
      ['02-permissions', '/permissions', 'الأذونات'],
      ['03-welcome', '/welcome', 'ابدأ'],
      ['04-login', '/login', 'تسجيل الدخول'],
      ['05-register', '/register', 'إنشاء حساب'],
      ['06-otp', '/otp', 'رمز التحقق'],
      ['07-forgot-password', '/forgot-password', 'استعادة كلمة المرور'],
    ],
    private: [
      ['10-home', '/home', 'الرئيسية'],
      ['11-ride-request', '/ride-request', 'طلب رحلة'],
      ['12-checkout', '/checkout', 'الدفع'],
      ['13-trips', '/trips', 'رحلاتي'],
      ['14-wallet', '/wallet', 'المحفظة'],
      ['15-subscriptions', '/subscriptions', 'الاشتراكات'],
      ['16-addresses', '/addresses', 'عنواني'],
      ['17-notifications', '/notifications', 'الإشعارات'],
      ['18-chat', '/chat', 'المحادثة'],
      ['19-assistant', '/assistant', 'المساعد الذكي'],
      ['20-support', '/support', 'الدعم'],
      ['21-emergency', '/emergency', 'الطوارئ'],
      ['22-settings', '/settings', 'الإعدادات'],
    ],
  },
  {
    name: 'driver-app',
    dir: 'driver',
    base: DRIVER,
    metrics: PHONE,
    auth: 'localStorage',
    storageKey: 'rafeeq_driver_token',
    /*
     | Seeded by DemoSeeder::seedDrivers — '+96278' + (200000 + i).
     |
     | Index 0 is the first of three `Approved` captains (the array continues Pending,
     | UnderReview, Suspended), with a 4.9 rating over 340 trips and 42 000 fils in its
     | wallet — so the earnings and account screens have something to show.
     */
    login: { phone: '+962780200000' },
    settle: 3000,
    public: [
      ['01-intro', '/intro', 'الترحيب والتعريف'],
      ['02-permissions', '/permissions', 'الأذونات'],
      ['03-welcome', '/welcome', 'ابدأ'],
      ['04-login', '/login', 'تسجيل الدخول'],
      ['05-register', '/register', 'إنشاء حساب كابتن'],
      ['06-otp', '/otp', 'رمز التحقق'],
      ['07-forgot-password', '/forgot-password', 'استعادة كلمة المرور'],
    ],
    private: [
      ['10-dashboard', '/dashboard', 'لوحة الكابتن'],
      ['11-offers', '/offers', 'العروض'],
      ['12-trips', '/trips', 'رحلاتي'],
      ['13-earnings', '/earnings', 'الأرباح'],
      ['14-vehicle-docs', '/vehicle-docs', 'وثائق المركبة'],
      ['15-notifications', '/notifications', 'الإشعارات'],
      ['16-chat', '/chat', 'المحادثة'],
      ['17-account', '/account', 'حسابي'],
    ],
  },
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
   * Throws on a page-side exception instead of resolving `undefined`: a swallowed
   * exception here is how an earlier version produced 29 identical files.
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

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see scripts/screenshots.sh`);

  return value;
}

/** Navigate, wait for load, then settle for the after-mount fetches. */
async function goto(cdp, url, settle) {
  await cdp.send('Page.navigate', { url });
  await cdp.once('Page.loadEventFired', 20000);
  // These screens fetch after mount, so give them a beat. This is the difference
  // between a screenshot of the product and a screenshot of its skeletons.
  await sleep(settle);
}

async function shoot(cdp, dir, slug) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(data, 'base64');
  writeFileSync(resolve(dir, `${slug}.png`), buffer);

  return buffer;
}

/**
 * Explain a rejected session instead of merely reporting one.
 *
 * "Not accepted" has causes that look identical from outside — never stored, stored
 * but not sent, or sent and refused. The cookie jar answers the first two.
 */
async function diagnose(cdp) {
  const lines = [];
  try {
    const { cookies } = await cdp.send('Network.getAllCookies');
    lines.push(
      cookies.length === 0
        ? '  cookie jar: EMPTY'
        : `  cookie jar: ${cookies.map((c) => `${c.name}(secure=${c.secure})`).join(', ')}`,
    );
  } catch (e) {
    lines.push(`  cookie jar: unreadable (${e.message})`);
  }
  try {
    lines.push(`  localStorage keys: ${await cdp.eval('Object.keys(localStorage).join(",")')}`);
  } catch (e) {
    lines.push(`  localStorage: unreadable (${e.message})`);
  }

  return lines.join('\n');
}

/** A bearer token straight from the API, for the apps that can hold one in JS. */
async function apiToken(phone) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      phone,
      password: required('DEMO_SEED_PASSWORD'),
      device_name: 'screenshots',
    }),
  });

  const json = await res.json().catch(() => ({}));
  const token = (json.data ?? json)?.token;
  if (!res.ok || typeof token !== 'string') {
    throw new Error(`login failed for ${phone} (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  }

  return token;
}

/**
 * Sign the dashboard in from INSIDE the page, so the browser stores the `httpOnly`
 * cookie under its own rules. Verified here rather than 28 pages later.
 */
async function signInDashboard(cdp) {
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

  const established = await cdp.eval(`(async () => {
    const r = await fetch('/api/session', { cache: 'no-store' });
    return (await r.json()).authenticated === true;
  })()`);

  if (!established) {
    throw new Error(
      `login returned 200 but no session was established.\n  body: ${outcome.body}\n${await diagnose(cdp)}`,
    );
  }
}

/** Give an Expo web app a session by writing the key its own storage layer reads. */
async function signInApp(cdp, target) {
  const token = await apiToken(target.login.phone);
  await cdp.eval(
    `localStorage.setItem(${JSON.stringify(target.storageKey)}, ${JSON.stringify(token)})`,
  );
  // The app reads the token once, while bootstrapping. Writing it into an already
  // running bundle changes nothing until the bundle starts again.
  await goto(cdp, `${target.base}/`, target.settle);
}

async function captureTarget(cdp, target) {
  const dir = resolve(OUT_BASE, target.dir);
  mkdirSync(dir, { recursive: true });

  await cdp.send('Emulation.setDeviceMetricsOverride', target.metrics);
  console.log(`\n── ${target.name} (${target.metrics.width}×${target.metrics.height}) ──`);

  const written = [];

  const capture = async ([slug, path, title], phase) => {
    await goto(cdp, `${target.base}${path}`, target.settle);

    const landed = await cdp.eval('location.pathname');
    // A private page bounces when the session was not accepted. Without this the run
    // "succeeds" and commits a folder full of login screens.
    if (phase === 'private' && /^\/(login|welcome|intro)$/.test(landed)) {
      throw new Error(
        `${target.name}${path} bounced to ${landed} — the session is not being accepted.\n${await diagnose(cdp)}`,
      );
    }

    const buffer = await shoot(cdp, dir, slug);
    written.push({ slug, path, title, bytes: buffer.length });
    console.log(`  ✓ ${path.padEnd(18)} → ${slug}.png (${(buffer.length / 1024).toFixed(0)} KB)`);
  };

  for (const page of target.public) await capture(page, 'public');

  if (target.auth === 'cookie') await signInDashboard(cdp);
  else await signInApp(cdp, target);
  console.log('  · signed in');

  for (const page of target.private) await capture(page, 'private');

  // Two identical files mean navigation is not being tracked. Byte length is a weak
  // hash, but it is exactly the failure that happened before.
  const sizes = new Map();
  for (const page of written) {
    sizes.set(page.bytes, [...(sizes.get(page.bytes) ?? []), page.slug]);
  }
  const collisions = [...sizes.values()].filter((g) => g.length > 1);
  if (collisions.length > 0) {
    throw new Error(`identical screenshots in ${target.name}: ${collisions.map((g) => g.join('=')).join(', ')}`);
  }

  writeFileSync(resolve(dir, 'index.json'), `${JSON.stringify(written, null, 2)}\n`);

  return written.length;
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length > 0 ? TARGETS.filter((t) => only.includes(t.dir)) : TARGETS;
  if (targets.length === 0) throw new Error(`no target matches ${only.join(',')}`);

  mkdirSync(OUT_BASE, { recursive: true });

  const target = await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  let total = 0;
  for (const t of targets) total += await captureTarget(cdp, t);

  cdp.close();
  console.log(`\n${total} screenshots across ${targets.length} apps in docs/design/screenshots/`);
}

main().catch((e) => {
  console.error(`capture failed: ${e.message}`);
  process.exit(1);
});
