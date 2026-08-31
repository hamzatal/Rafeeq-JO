#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   REFERENCE vs LIVE — the same screen, the same pixel dimensions, side by side.

   ── Why this exists ────────────────────────────────────────────────────────

   Two things made "is it matching?" impossible to answer by looking:

   1. The screenshots were captured at 1440×960 while the approved sheets are drawn at
      1280×820. Comparing a screen at two different sizes hides exactly the differences
      that matter — density, type scale, column widths — because everything is uniformly
      the wrong size.

   2. Regenerated images keep the SAME filenames, so a browser or a CDN happily serves
      the previous bytes. The files on `main` demonstrably change (105461 → 104684 →
      110657 …) while a reader sees one frozen picture and concludes nothing happened.

   So: the reference is re-rendered from `docs/design/src/06-admin-*.html` — the HTML the
   approved PNGs were made from — by screenshotting its `.admin` element, which IS
   1280×820. The live dashboard is then captured at exactly 1280×820. Two files of
   identical dimensions, under `docs/design/screenshots/compare/`, in a folder that did
   not exist before, so nothing can be cached.

   ── What it deliberately does NOT do ──────────────────────────────────────

   It does not diff pixels or emit a similarity score. The sheets carry invented demo
   content (TRP-4821, «حمزة ط.», 1,842 د.أ) and the live app renders what the seeders
   actually produced, so a pixel diff would report a hundred differences that are all
   the same fact: the data is not the same data. Judgement is the reader's; this only
   makes the comparison fair.

   Usage — needs the dashboard on :3000 and Chrome on :9222, as screenshots.sh sets up:
     node scripts/capture-compare.mjs
   ═══════════════════════════════════════════════════════════════════════════ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(ROOT, 'docs/design/screenshots/compare');

const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const DASHBOARD = process.env.DASHBOARD_URL ?? 'http://127.0.0.1:3000';
/** The design sheets, served as static files so `kit.css` and the fonts resolve. */
const SHEETS = process.env.SHEETS_URL ?? 'http://127.0.0.1:4003';

/** The canvas the sheets are drawn on: `.admin{width:1280px;height:820px}`. */
const FRAME = { width: 1280, height: 820 };

/**
 * Which live route corresponds to which drawn screen.
 *
 * `nth` is the index of the `.admin` element within the sheet, because each sheet holds
 * three screens. Only the screens that HAVE a live counterpart are listed: the sheets
 * also draw «ملف الكابتن — مراجعة الوثائق», which is a detail view behind a row click
 * and has no standalone URL.
 */
const PAIRS = [
  { slug: '33-dashboard', sheet: '06-admin-1.html', nth: 0, live: '/', title: 'لوحة القيادة' },
  { slug: '34-ride-requests', sheet: '06-admin-1.html', nth: 1, live: '/ride-requests', title: 'الطلبات الحيّة' },
  { slug: '35-drivers', sheet: '06-admin-1.html', nth: 2, live: '/drivers', title: 'الكباتن' },
  { slug: '37-payments', sheet: '06-admin-2.html', nth: 1, live: '/payments', title: 'المدفوعات — شحن CliQ' },
  { slug: '38-safety', sheet: '06-admin-2.html', nth: 2, live: '/safety', title: 'السلامة و SOS' },
  { slug: '39-pricing', sheet: '06-admin-3.html', nth: 0, live: '/pricing?tab=tariff', title: 'التسعير والخطط' },
  { slug: '40-support', sheet: '06-admin-3.html', nth: 1, live: '/support?tab=tickets', title: 'الدعم والشكاوى' },
  /* `?tab=audit`, not `?tab=sessions`: screen 41 IS the audit trail with its four cards
     above it. Comparing the MFA tab against that sheet was comparing two different
     screens and reporting the difference as a design failure. */
  { slug: '41-security', sheet: '06-admin-3.html', nth: 2, live: '/security?tab=audit', title: 'الأمان والتدقيق' },
];

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

  static async connect(url) {
    const ws = new WebSocket(url, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
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
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), fn]);
  }

  once(method, timeout) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeout);
      this.on(method, () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);

    return result.value;
  }

  close() {
    this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Block until nothing on the page is still loading.
 *
 * `.animate-pulse` is `Skeleton`'s class and «جارٍ التحميل» is the text the few
 * skeleton-less tables use, so between them they cover every loading state the
 * dashboard has. Polls rather than sleeps, so a fast page is captured immediately and a
 * slow one is still captured correctly.
 */
async function settled(cdp, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const busy = await cdp.eval(
      `!!document.querySelector('.animate-pulse') || document.body.innerText.includes('جارٍ التحميل')`,
    );
    if (!busy) {
      /* One more frame so the rows that just replaced the skeleton have painted. */
      await sleep(350);

      return true;
    }
    await sleep(250);
  }

  console.warn('  ! still loading at capture time — the screenshot will show it');

  return false;
}

async function goto(cdp, url, settle) {
  await cdp.send('Page.navigate', { url });
  await cdp.once('Page.loadEventFired', 20000);
  await sleep(settle);
}

function save(slug, kind, data) {
  const buffer = Buffer.from(data, 'base64');
  writeFileSync(resolve(OUT, `${slug}-${kind}.png`), buffer);

  return buffer.length;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const target = await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  /* ── the drawn reference, straight out of the sheet's own HTML ─────────── */
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    // Wide enough that the 1280px sheet is never squeezed by its own page padding.
    width: 1500,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  let sheetLoaded = '';
  for (const pair of PAIRS) {
    if (sheetLoaded !== pair.sheet) {
      await goto(cdp, `${SHEETS}/${pair.sheet}`, 2500);
      // `font-display:block` — the frames must not be shot mid-swap.
      await cdp.eval('document.fonts.ready.then(() => true)');
      sheetLoaded = pair.sheet;
    }

    const box = await cdp.eval(`(() => {
      const el = document.querySelectorAll('.admin')[${pair.nth}];
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
    })()`);

    if (!box) throw new Error(`${pair.sheet}: no .admin[${pair.nth}]`);

    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { ...box, scale: 1 },
    });
    const bytes = save(pair.slug, 'reference', data);
    console.log(`  ◻ ${pair.slug.padEnd(18)} reference  ${Math.round(box.width)}×${Math.round(box.height)}  ${(bytes / 1024).toFixed(0)} KB`);
  }

  /* ── the live product, at the sheet's exact canvas ─────────────────────── */
  await cdp.send('Emulation.setDeviceMetricsOverride', { ...FRAME, deviceScaleFactor: 1, mobile: false });

  await goto(cdp, `${DASHBOARD}/login`, 1500);
  const outcome = await cdp.eval(`(async () => {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ${JSON.stringify(process.env.SEED_ADMIN_EMAIL ?? '')},
        password: ${JSON.stringify(process.env.SEED_ADMIN_PASSWORD ?? '')},
      }),
      credentials: 'same-origin',
    });
    return res.status;
  })()`);
  if (outcome !== 200) throw new Error(`sign-in failed (${outcome})`);

  for (const pair of PAIRS) {
    await goto(cdp, `${DASHBOARD}${pair.live}`, 1200);

    const landed = await cdp.eval('location.pathname');
    if (landed === '/login') throw new Error(`${pair.live} bounced to /login`);

    /*
     * ── Wait for the DATA, not for a stopwatch ────────────────────────────────
     *
     * This slept a flat 2600ms. On a page whose table waits on two requests that was
     * sometimes enough and sometimes not — the security screen shipped a committed
     * screenshot of five grey placeholder bars where the audit trail should be, and the
     * pair it belongs to is the artefact the whole comparison rests on. A timing race
     * that resolves differently per run is worse than a slow capture: it makes the
     * evidence unreliable in a way that is invisible in the log, which printed «✓».
     *
     * `Skeleton` is one component with one class, so its absence is a real readiness
     * signal for every page here. The timeout still fires eventually, because a page
     * that genuinely never loads must produce a screenshot showing that.
     */
    await settled(cdp);

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const bytes = save(pair.slug, 'live', data);
    console.log(`  ◼ ${pair.slug.padEnd(18)} live       ${FRAME.width}×${FRAME.height}  ${(bytes / 1024).toFixed(0)} KB`);
  }

  writeFileSync(
    resolve(OUT, 'index.json'),
    `${JSON.stringify(
      PAIRS.map((p) => ({ slug: p.slug, title: p.title, live: p.live, sheet: p.sheet })),
      null,
      2,
    )}\n`,
  );

  cdp.close();
  console.log(`\n${PAIRS.length} pairs at ${FRAME.width}×${FRAME.height} in docs/design/screenshots/compare/`);
}

main().catch((e) => {
  console.error(`compare failed: ${e.message}`);
  process.exit(1);
});
