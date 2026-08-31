#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   IDENTITY GATE — the one the other gates could not be.

   ── The failure this exists to prevent ─────────────────────────────────────

   `check:design` holds `retired-identity` at a HARD ZERO and printed «✓ 0» on every CI
   run for four phases, while the logo on every screen of all three front-ends WAS the
   retired identity: a raster Latin "R" in cyan and orange, byte-identical in
   `packages/ui/assets/r-logo.png` and `admin-dashboard/public/r-logo.png`. A third
   identity — a black-green-and-gold "Petra" badge — sat unused in
   `packages/shared/assets/`.

   The gate was not lying. It greps SOURCE TEXT for retired hex values, and a PNG's
   pixels are not text. Every value-level gate in this repo shares that blind spot, so
   the approved mark could be specified in `docs/design/v2/00-logo.png`, implemented in
   the store icons, and never reach the screens — with nothing to report the gap.

   A previous pass even rewrote `Logo.tsx`'s docblock because it described «the teal "R"
   glyph», settling on "the artwork carries its own colour". The prose was corrected;
   the artwork was the teal R.

   ── What this checks ──────────────────────────────────────────────────────

   1. The mark is GEOMETRY, and the geometry in `@rafeeq/tokens` matches the drawing in
      `docs/design/src/ui.mjs` that produced the approved sheet. Two numbers drifting
      apart is how a design sheet stops describing the product.

   2. No raster identity asset exists outside the generated store set. A hand-uploaded
      logo file is precisely what went stale, and there is no longer any reason for one
      to exist: both renderers draw from the geometry.

   Usage: node scripts/check-identity.mjs
   ═══════════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '..');
const SKIP = new Set(['node_modules', '.next', '.expo', 'dist', 'build', '.git', 'coverage']);

const failures = [];

/* ── 1 · the geometry must match the sheet that drew it ──────────────────── */
{
  const tokens = readFileSync(resolve(ROOT, 'packages/tokens/src/brand.ts'), 'utf8');
  const sheet = readFileSync(resolve(REPO, 'docs/design/src/ui.mjs'), 'utf8');

  /** Pull `mark()`'s literal geometry out of the design sheet. */
  const sheetMark = sheet.slice(sheet.indexOf('export function mark('));
  const body = sheetMark.slice(0, sheetMark.indexOf('\n}'));

  const wanted = [
    // [what it is, value as written in the sheet, value as written in tokens]
    ['stroke width', /stroke-width="\$\{w\}"/.test(body) && /w = (\d+(?:\.\d+)?)/.exec(sheetMark)?.[1], /strokeWidth:\s*(\d+(?:\.\d+)?)/.exec(tokens)?.[1]],
    ['viewBox', /viewBox="0 0 (\d+) \d+"/.exec(body)?.[1], /viewBox:\s*(\d+)/.exec(tokens)?.[1]],
    ['origin cx', /<circle cx="(\d+(?:\.\d+)?)" cy="\d+(?:\.\d+)?" r="\d+(?:\.\d+)?" stroke/.exec(body)?.[1], /origin:\s*\{\s*cx:\s*(\d+(?:\.\d+)?)/.exec(tokens)?.[1]],
    ['origin cy', /<circle cx="\d+(?:\.\d+)?" cy="(\d+(?:\.\d+)?)" r="\d+(?:\.\d+)?" stroke/.exec(body)?.[1], /origin:\s*\{[^}]*cy:\s*(\d+(?:\.\d+)?)/.exec(tokens)?.[1]],
    ['origin r', /<circle cx="\d+(?:\.\d+)?" cy="\d+(?:\.\d+)?" r="(\d+(?:\.\d+)?)" stroke/.exec(body)?.[1], /origin:\s*\{[^}]*r:\s*(\d+(?:\.\d+)?)/.exec(tokens)?.[1]],
    ['route path', /<path d="([^"]+)"/.exec(body)?.[1], /route:\s*'([^']+)'/.exec(tokens)?.[1]],
    ['destination cx', /<circle cx="(\d+(?:\.\d+)?)" cy="\d+(?:\.\d+)?" r="\d+(?:\.\d+)?" fill/.exec(body)?.[1], /destination:\s*\{\s*cx:\s*(\d+(?:\.\d+)?)/.exec(tokens)?.[1]],
    ['destination cy', /<circle cx="\d+(?:\.\d+)?" cy="(\d+(?:\.\d+)?)" r="\d+(?:\.\d+)?" fill/.exec(body)?.[1], /destination:\s*\{[^}]*cy:\s*(\d+(?:\.\d+)?)/.exec(tokens)?.[1]],
    ['destination r', /<circle cx="\d+(?:\.\d+)?" cy="\d+(?:\.\d+)?" r="(\d+(?:\.\d+)?)" fill/.exec(body)?.[1], /destination:\s*\{[^}]*r:\s*(\d+(?:\.\d+)?)/.exec(tokens)?.[1]],
  ];

  for (const [what, fromSheet, fromTokens] of wanted) {
    if (!fromSheet || !fromTokens) {
      failures.push(`could not read ${what} — sheet: ${fromSheet ?? 'null'} · tokens: ${fromTokens ?? 'null'}`);
    } else if (String(fromSheet) !== String(fromTokens)) {
      failures.push(`${what}: docs/design/src/ui.mjs says "${fromSheet}", packages/tokens says "${fromTokens}"`);
    }
  }
}

/* ── 2 · no hand-uploaded raster identity ────────────────────────────────── */
{
  /*
   * The store assets ARE rasters, and legitimately so — Expo and the two stores
   * require PNG. They are generated from the same geometry by
   * `docs/design/src/gen-app-assets.mjs`, and they live only in an app's `assets/`.
   * Anything logo-shaped anywhere else is a file somebody uploaded.
   */
  const ALLOWED = new Set([
    'student-app/assets/icon.png',
    'student-app/assets/adaptive-icon.png',
    'student-app/assets/splash.png',
    'student-app/assets/favicon.png',
    'student-app/assets/notification-icon.png',
    'driver-app/assets/icon.png',
    'driver-app/assets/adaptive-icon.png',
    'driver-app/assets/splash.png',
    'driver-app/assets/favicon.png',
    'driver-app/assets/notification-icon.png',
    'admin-dashboard/app/icon.png',
  ]);

  const SUSPECT = /(logo|brand|wordmark|r-logo)/i;

  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else out.push(full);
    }

    return out;
  };

  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file);
    if (!/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(rel)) continue;
    if (ALLOWED.has(rel)) continue;
    if (!SUSPECT.test(rel)) continue;
    failures.push(
      `${rel} — a logo asset outside the generated store set. The mark is geometry ` +
        `(packages/tokens/src/brand.ts); draw it instead of committing a raster.`,
    );
  }
}

if (failures.length > 0) {
  console.error('\nidentity: the mark is not one thing\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(
    '\nwhy: `retired-identity` in check:design greps source TEXT, so a raster of a\n' +
      '     retired logo passes it. This gate is the pixels-shaped hole in that one.\n',
  );
  process.exit(1);
}

console.log('identity: one mark — tokens geometry matches docs/design/src/ui.mjs, no stray rasters');
