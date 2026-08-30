#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Design-token gates.

   ── Why these are RATCHETS and not zeroes ──────────────────────────────────

   The roadmap asked for seven gates all reading zero. Two of them can be zero
   today — the retired identity and the fictional font weight are gone, and they
   must never come back. The rest cannot: there are 457 raw `fontSize:` literals
   and 256 physical-direction style props across the two apps, and the screens
   holding them are rewritten in phases 8 and 9. Blocking the build on those now
   would mean either a red build for two phases or an enormous unreviewable
   rewrite in this one.

   So the count-based gates hold a BUDGET, and the budget only ever goes down. A
   number that cannot rise is a debt being paid; a number asserted to be zero
   before it is zero is a gate someone disables. When phase 9 finishes, the budgets
   are zero and the ratchet becomes the assertion the roadmap wanted.

   Every budget below is the measured count at the end of the phase that last moved
   it — phase 6 for most, phase 7 for the three that extracting `packages/ui` paid
   down. Lowering one is
   always allowed — the script tells you the new number to commit.

   Usage: node scripts/check-design-tokens.mjs
   ═══════════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.expo', 'dist', 'build', '.git', 'coverage', 'android', 'ios']);

/** `packages/tokens` IS the place values are allowed to be literals. */
const TOKENS = 'packages/tokens/src';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(full);
  }

  return out;
}

const COMMENT = /^\s*(\/\/|\/\*|\*|\{\/\*)/;

const files = walk(ROOT).map((f) => ({ rel: relative(ROOT, f).replace(/\\/g, '/'), body: readFileSync(f, 'utf8') }));

/* ═════════════════════════ THE GATES ══════════════════════════════════════ */

const gates = [];

/**
 * GATE 1 — the retired identity. HARD ZERO.
 *
 * Phase 4 deleted the navy/teal brand and it survived in three places nobody
 * looked at: the old `theme/colors.ts` palette (which both apps' SPLASH SCREEN
 * rendered), the `shadowColor` on every React Native shadow, and four scrollbar
 * rules in the admin's `globals.css`. Three audits missed it because a navy shadow
 * at 5% opacity is indistinguishable from a grey one.
 *
 * Matched by VALUE, so it cannot come back under a new name.
 */
{
  const dead = [
    ['#002045', 'retired navy'],
    ['#001B3C', 'retired navy deep'],
    ['#1A365D', 'retired navy container'],
    ['#006A65', 'retired teal'],
    ['#4EDBD2', 'retired teal bright'],
    ['0, 32, 69', 'retired navy as rgb'],
    ['0,32,69', 'retired navy as rgb'],
    ['0, 106, 101', 'retired teal as rgb'],
    ['0,106,101', 'retired teal as rgb'],
  ];
  const hits = [];
  for (const { rel, body } of files) {
    if (rel.startsWith(TOKENS)) continue; // RETIRED lives there so a gate can name it
    body.split('\n').forEach((line, i) => {
      if (COMMENT.test(line)) return;
      for (const [value, what] of dead) {
        if (line.includes(value)) hits.push(`${rel}:${i + 1}  ${what} (${value})`);
      }
    });
  }
  gates.push({
    id: 'retired-identity',
    budget: 0,
    count: hits.length,
    hits,
    why: 'the navy/teal identity was deleted in phase 4 — a value from it is a screen rendering a dead brand',
    fix: 'use a token from @rafeeq/tokens',
  });
}

/**
 * GATE 2 — the fictional font weight. HARD ZERO.
 *
 * `extrabold` was aliased to the 700 face because IBM Plex Sans Arabic has no 800,
 * so 94 call sites asked for a weight that does not exist and silently got bold.
 * On the web the same name is CSS 800, where the browser SYNTHESISES a face by
 * smearing the 700 outline — so the dashboard was faux-bold while the apps were
 * real bold, from one design.
 */
{
  const hits = [];
  for (const { rel, body } of files) {
    if (rel.startsWith(TOKENS)) continue;
    body.split('\n').forEach((line, i) => {
      if (COMMENT.test(line)) return;
      if (/\bextrabold\b|font-extrabold/.test(line)) hits.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
  gates.push({
    id: 'fictional-weight',
    budget: 0,
    count: hits.length,
    hits,
    why: 'IBM Plex Sans Arabic has no 800 weight — `extrabold` is a token that lies, and on the web it fakes one',
    fix: 'use fontFamily.bold (or font-bold)',
  });
}

/**
 * GATE 3 — raw hex outside the token package. RATCHET.
 *
 * A hex literal in a screen is a colour nobody can change centrally. Most of the
 * remaining ones are `#fff`/`#000` in gradients and map overlays.
 */
{
  const hits = [];
  for (const { rel, body } of files) {
    if (rel.startsWith(TOKENS)) continue;
    if (rel.endsWith('.css')) continue; // generated or Tailwind-layer, gated separately
    body.split('\n').forEach((line, i) => {
      if (COMMENT.test(line)) return;
      const m = line.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (m) m.forEach((h) => hits.push(`${rel}:${i + 1}  ${h}`));
    });
  }
  gates.push({
    id: 'raw-hex',
    budget: 24,
    count: hits.length,
    hits,
    why: 'a hex in a screen is a colour that cannot be changed from one place',
    fix: 'import the token from @rafeeq/tokens',
  });
}

/**
 * GATE 4 — raw `fontSize:` literals. RATCHET.
 *
 * 457 of them across 21 distinct values, which is why the old t-shirt scale had
 * zero imports: it did not answer "what is this text for". The role scale
 * (`type.titleMd`) does. Phases 8 and 9 rewrite these screens.
 */
{
  const hits = [];
  for (const { rel, body } of files) {
    if (rel.startsWith(TOKENS)) continue;
    body.split('\n').forEach((line, i) => {
      if (COMMENT.test(line)) return;
      const m = line.match(/fontSize:\s*[\d.]+/g);
      if (m) m.forEach((x) => hits.push(`${rel}:${i + 1}  ${x}`));
    });
  }
  gates.push({
    id: 'raw-font-size',
    budget: 101,
    count: hits.length,
    hits,
    why: 'a pixel literal is a type decision made in isolation — 21 different sizes across two apps',
    fix: 'spread a role from the scale: {...t.type.titleMd}',
  });
}

/**
 * GATE 5 — physical direction in styles. RATCHET.
 *
 * `marginLeft` is wrong in one of the two directions the product ships. The
 * logical properties (`marginStart`/`marginEnd`) flip automatically, so an RTL bug
 * becomes impossible rather than merely fixed.
 */
{
  const hits = [];
  const RE = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\b/g;
  for (const { rel, body } of files) {
    if (rel.startsWith(TOKENS) || rel.endsWith('.css')) continue;
    body.split('\n').forEach((line, i) => {
      if (COMMENT.test(line)) return;
      const m = line.match(RE);
      if (m) m.forEach((x) => hits.push(`${rel}:${i + 1}  ${x}`));
    });
  }
  gates.push({
    id: 'physical-direction',
    budget: 3,
    count: hits.length,
    hits,
    why: 'a physical direction is correct in only one of the two directions this product ships',
    fix: 'use the logical property: marginStart / marginEnd / paddingStart / paddingEnd',
  });
}

/**
 * GATE 6 — a dark-mode variant. HARD ZERO.
 *
 * Decision 7 removed dark mode. A `dark:` class is a style nobody can see and
 * nobody maintains — it was already cleaned to zero, and this keeps it there.
 */
{
  const hits = [];
  for (const { rel, body } of files) {
    body.split('\n').forEach((line, i) => {
      if (COMMENT.test(line)) return;
      const m = line.match(/\bdark:[a-z-]+/g);
      if (m) m.forEach((x) => hits.push(`${rel}:${i + 1}  ${x}`));
    });
  }
  gates.push({
    id: 'dark-variant',
    budget: 0,
    count: hits.length,
    hits,
    why: 'dark mode was removed (decision 7) — a dark: variant is unreachable style',
    fix: 'delete it',
  });
}

/**
 * GATE 7 — the deprecated legacy type scale. RATCHET, and it must not grow.
 *
 * `legacyText` carries the OLD scale at its exact old values, because the two
 * screens that spread it are rewritten in phase 8 and remapping their type now
 * would be an unreviewed pixel change on files about to be deleted. It is allowed
 * to exist and not allowed to spread.
 */
{
  const hits = [];
  for (const { rel, body } of files) {
    if (rel.startsWith(TOKENS)) continue;
    body.split('\n').forEach((line, i) => {
      if (COMMENT.test(line)) return;
      if (/\blegacyText\b/.test(line)) hits.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
  gates.push({
    id: 'legacy-type-scale',
    budget: 0,
    count: hits.length,
    hits,
    why: 'legacyText exists only until phase 8 rewrites home.tsx and ride-request.tsx',
    fix: 'use the role scale: type.titleMd / type.body / type.caption',
  });
}

/**
 * GATE 8 — contrast. HARD ZERO.
 *
 * Every foreground/background pair the semantic map declares must clear WCAG AA
 * for body text (4.5:1). The audit found one failing pair; asserting it here means
 * a future palette tweak cannot reintroduce one silently, which is the only way
 * this stays true — nobody re-checks contrast by hand after a colour change.
 */
{
  const tok = readFileSync(resolve(ROOT, 'packages/tokens/src/semantic.ts'), 'utf8');
  const raw = readFileSync(resolve(ROOT, 'packages/tokens/src/color.ts'), 'utf8');

  const ramp = {};
  for (const m of raw.matchAll(/^\s+(\d+):\s*'(#[0-9A-Fa-f]{6})'/gm)) ramp[m[1]] = m[2];
  for (const m of raw.matchAll(/^\s+(\w+):\s*'(#[0-9A-Fa-f]{6})'/gm)) ramp[m[1]] = m[2];

  const role = {};
  for (const m of tok.matchAll(/^\s+(\w+):\s*(brand|neutral|status)\[(\d+|\w+)\]/gm)) role[m[1]] = ramp[m[3]];
  for (const m of tok.matchAll(/^\s+(\w+):\s*status\.(\w+)/gm)) role[m[1]] = ramp[m[2]];

  const lum = (hex) => {
    const c = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));

    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);

    return (x + 0.05) / (y + 0.05);
  };

  // Pairs that carry BODY TEXT and therefore need 4.5:1.
  const pairs = [
    ['text', 'background'], ['text', 'surface'],
    ['textSecondary', 'background'], ['textSecondary', 'surface'],
    ['muted', 'surface'],
    ['onPrimary', 'primary'], ['onAccent', 'accent'],
    ['primary', 'surface'], ['danger', 'surface'], ['success', 'surface'], ['warning', 'surface'],
  ];

  const hits = [];
  for (const [fg, bg] of pairs) {
    const f = role[fg];
    const b = role[bg];
    if (!f || !b) continue; // resolved through alpha() — not a flat pair
    const r = ratio(f, b);
    if (r < 4.5) hits.push(`${fg} on ${bg}  ${f}/${b}  ${r.toFixed(2)}:1  (needs 4.5)`);
  }

  gates.push({
    id: 'contrast',
    budget: 0,
    count: hits.length,
    hits,
    why: 'a foreground/background pair below 4.5:1 is body text somebody cannot read',
    fix: 'darken the foreground or lighten the surface in packages/tokens',
  });
}

/* ═════════════════════════ REPORT ═════════════════════════════════════════ */

let failed = 0;
let ratcheted = 0;

console.log('\ndesign tokens\n');
for (const g of gates) {
  const kind = g.budget === 0 ? 'must be 0' : `budget ${g.budget}`;

  if (g.count > g.budget) {
    failed++;
    console.error(`  ✗ ${g.id.padEnd(20)} ${String(g.count).padStart(4)}  (${kind})`);
    console.error(`      why: ${g.why}`);
    console.error(`      fix: ${g.fix}`);
    for (const h of g.hits.slice(0, 12)) console.error(`        ${h}`);
    if (g.hits.length > 12) console.error(`        … and ${g.hits.length - 12} more`);
    console.error('');
  } else if (g.count < g.budget) {
    ratcheted++;
    console.log(`  ✓ ${g.id.padEnd(20)} ${String(g.count).padStart(4)}  (budget ${g.budget} — LOWER IT to ${g.count})`);
  } else {
    console.log(`  ✓ ${g.id.padEnd(20)} ${String(g.count).padStart(4)}  (${kind})`);
  }
}

if (failed > 0) {
  console.error(`design tokens: ${failed} gate(s) failed.\n`);
  process.exit(1);
}

if (ratcheted > 0) {
  console.log(
    `\n${ratcheted} budget(s) are now higher than the real count. Lower them in this file ` +
    'so the ratchet keeps holding — a budget with slack is a budget that lets debt back in.\n',
  );
}

console.log('design tokens: all gates pass\n');
