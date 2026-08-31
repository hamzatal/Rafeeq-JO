#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN PARITY — does each page contain what its approved sheet says it contains?

   ── The gate that was missing, and what it cost ────────────────────────────

   `docs/design/src/*.html` are the approved screens. They were `.gitignore`d as
   "intermediate build output" while the PNG renders were committed as "the reviewed
   artefact" — exactly backwards. A PNG carries STYLE: colour, radius, spacing, weight.
   It cannot carry STRUCTURE: that this table has eight columns named «الطلب … الحالة»,
   that this header has «تصدير CSV» beside «دعوة كابتن», that four cards sit above the
   queue labelled «معتمدون · بانتظار التوثيق · موقوفون · متوسّط التقييم».

   So every existing gate — `check:tokens`, `check:design`, `check:icons` — compared the
   code to ITSELF: token names, a hex budget, an icon allowlist. All of them passed at
   100% while the dashboard carried 31 of the sheets' 103 required elements. Nothing
   could fail for being 30% of the design, so the drift was invisible and the work that
   got done was the cross-cutting kind (density, navigation, tokens, logo) which is the
   only kind a picture can specify. The page bodies were never rebuilt.

   This script closes that loop. It reads the sheets as the SOURCE, extracts what each
   screen demonstrably contains, and asserts the mapped route's source carries it.

   ── What counts as a requirement ──────────────────────────────────────────

   Only strings a human reads and can verify by looking: table headers (`<th>`), button
   captions, KPI labels, panel titles. Not CSS — `check:design` owns that. Not invented
   demo values: the sheets contain «TRP-4821» and «1,842 د.أ» as illustration, and
   requiring those would be requiring fake data.

   ── Why comments are stripped from the live side ──────────────────────────

   This codebase comments heavily, and comments quote the design («the sheet says
   «دعوة كابتن»»). Counting those would let a page pass by DESCRIBING the design instead
   of rendering it — the precise failure this gate exists to catch. `check:design` had
   this bug for real: it counted hex literals inside comments.
   ═══════════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHEETS = join(ROOT, 'docs/design/src');
const DASHBOARD = join(ROOT, 'frontend/admin-dashboard');

/* Screen number → the route that must realise it. A screen with no entry is not yet
   claimed; add it here the moment its page is built, never before. */
const ROUTES = {
  33: 'app/(dashboard)/page.tsx',
  34: 'app/(dashboard)/ride-requests/page.tsx',
  35: 'app/(dashboard)/drivers/page.tsx',
  36: 'app/(dashboard)/drivers/[id]/page.tsx',
  37: 'app/(dashboard)/payments/page.tsx',
  38: 'app/(dashboard)/safety/page.tsx',
  39: 'app/(dashboard)/pricing/page.tsx',
  40: 'app/(dashboard)/support/page.tsx',
  41: 'app/(dashboard)/security/page.tsx',
};

/*
 * A RATCHET, per screen: the number of required elements each route must carry today.
 *
 * The target is 100% everywhere and these numbers only ever go up. They exist because
 * the alternative was a gate that fails on every commit until the last screen lands,
 * and a permanently red check is one people learn to scroll past — the same way the
 * design drifted to 25% while six other gates sat green.
 *
 * So: a screen that regresses fails the build immediately, and a screen that improves
 * fails until its number is raised here. Lowering an entry is the one edit that is
 * never correct; if a screen legitimately loses an element, the sheet changed, and the
 * sheet is in the repository where that shows up in the diff.
 */
const RATCHET = {
  33: 11,
  34: 4,
  35: 16, // ✓ complete
  36: 4,
  37: 5,
  38: 1,
  39: 1,
  40: 4,
  41: 5,
};

/* Illustrative demo values in the sheets — required to be ABSENT if anything, since
   the project forbids fabricated data. Never counted as requirements. */
const DEMO = /^(TRP-|RQ-|PAY-|SOS-|TKT-)|^[\d.,]+$|^[\d.,]+\s*(د\.أ|كم|دقيقة|ساعة)$/;

/* Invented people in the sheets. Screen 36's panel title is the captain's NAME — a
   data value, not a spec. Requiring it would require fabricated data, which the
   project forbids outright. */
const DEMO_NAMES = new Set([
  'سامر الرشيد',
  'محمد العبداللات',
  'أحمد الخطيب',
  'خالد السعدي',
  'ماهر العبيدي',
  'زيد الحوراني',
  'ليان القضاة',
  'نور الدين',
  'رهف العمري',
]);

const unescape = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

/** The Arabic for one dictionary key: `'nav.dashboard': { ar: '…', en: '…' }`. */
let DICTIONARY = null;
function dictionaryValue(key) {
  DICTIONARY ??= readFileSync(join(DASHBOARD, 'src/lib/i18n.ts'), 'utf8');

  return DICTIONARY.match(new RegExp(`'${key.replace(/\./g, '\\.')}':\\s*\\{\\s*ar:\\s*'([^']+)'`))?.[1] ?? null;
}

/** The heading this route renders, via `nav.ts` → `i18n.ts`, as `NavPageHeader` does. */
function navTitle(pageRelative) {
  const href = '/' + pageRelative.replace(/^app\/\(dashboard\)\/?/, '').replace(/\/?page\.tsx$/, '');
  const nav = readFileSync(join(DASHBOARD, 'src/lib/nav.ts'), 'utf8');
  const entry = nav.match(new RegExp(`href:\\s*'${href.replace(/[/[\]]/g, '\\$&')}'[^}]*?labelKey:\\s*'([^']+)'`, 's'))
    ?? nav.match(new RegExp(`labelKey:\\s*'([^']+)'[^}]*?href:\\s*'${href.replace(/[/[\]]/g, '\\$&')}'`, 's'));
  if (!entry) return null;

  return dictionaryValue(entry[1]);
}

/**
 * Everything a route actually renders, by walking its real import graph.
 *
 * Two false passes had to be closed before this number meant anything.
 *
 * A first cut globbed `src/views` and `src/components` wholesale for every page: «تصدير»
 * in `AdsView` then satisfied `/payments`. So the graph is now followed properly —
 * relative imports, transitively, from the page file.
 *
 * That still read 64%, because `src/lib/i18n.ts` is an 803-line dictionary that every
 * page reaches through `NavPageHeader`, and it already contains «تصدير CSV», «الأجرة»,
 * «الكابتن», «معالجة»… A shared dictionary ENTRY is not a rendered element, so i18n is
 * excluded and each page instead gets exactly one string from it: its own nav title,
 * resolved through the same `href → labelKey` path `NavPageHeader` uses.
 */
function liveSource(pageRelative) {
  const seen = new Set();
  const texts = [];

  const resolve = (spec, fromFile) => {
    const base = join(dirname(fromFile), spec);
    for (const candidate of [base, `${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }

    return null;
  };

  const walk = (abs) => {
    if (seen.has(abs)) return;
    seen.add(abs);

    const raw = readFileSync(abs, 'utf8');
    texts.push(raw);

    for (const [, spec] of raw.matchAll(/from\s+'(\.[^']+)'/g)) {
      const next = resolve(spec, abs);
      /* See above: the dictionary is not a rendering. */
      if (next && !next.endsWith('i18n.ts')) walk(next);
    }
  };

  const entry = join(DASHBOARD, pageRelative);
  if (!existsSync(entry)) return '';
  walk(entry);

  const source = texts.join('\n');
  texts.push(navTitle(pageRelative) ?? '');
  /* Plus the Arabic behind every `t('…')` key this graph actually references. Labels
     legitimately live in the dictionary — `AuditView` renders «الوقت» as
     `t('audit.when')` — and refusing to follow them would fail a page for being
     correctly internationalised. Only the keys REACHED are resolved, which is what
     kept the whole dictionary from satisfying every screen. */
  for (const [, key] of source.matchAll(/\bt\(\s*'([a-zA-Z][\w.]+)'/g)) {
    const value = dictionaryValue(key);
    if (value) texts.push(value);
  }

  return texts
    .join('\n')
    /* Strip comments — see the header. A page must RENDER the design, not describe it. */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/[^\n]*$/gm, '');
}

/** Pull the requirement set out of one screen's slice of a sheet. */
function requirements(slice) {
  const found = [];
  const add = (kind, raw) => {
    const text = unescape(raw).replace(/\s+/g, ' ').trim();
    if (!text || DEMO.test(text) || DEMO_NAMES.has(text)) return;
    if (!found.some((r) => r.kind === kind && r.text === text)) found.push({ kind, text });
  };

  for (const [, caption] of slice.matchAll(/<button class="btn [a-z-]+"[^>]*>([^<]+)<\/button>/g)) {
    add('زر', caption);
  }
  for (const [, header] of slice.matchAll(/<th>([^<]+)<\/th>/g)) add('عمود', header);
  for (const [, label] of slice.matchAll(/<div class="akpi"><span class="t-label"[^>]*>([^<]+)<\/span>/g)) {
    add('مؤشّر', label);
  }
  for (const [, title] of slice.matchAll(/class="t-title(?:-lg)?"[^>]*>([^<]{3,44})<\/span>/g)) {
    add('لوح', title);
  }

  return found;
}

/** Split a sheet into `{ number, title, slice }` per screen caption. */
function screens(html) {
  const out = [];
  const parts = html.split('<div class="cap">').slice(1);
  for (const part of parts) {
    const head = part.match(/^<div><span class="n">(\d+)<\/span><span class="t">([^<]+)<\/span>/);
    if (head) out.push({ number: Number(head[1]), title: head[2], slice: part });
  }

  return out;
}

// ── run ────────────────────────────────────────────────────────────────────

if (!existsSync(SHEETS)) {
  console.error(`✖ الصفائح المعتمدة غير موجودة: ${SHEETS}`);
  console.error('  هذه مواصفة المشروع ولا يجوز استثناؤها من المستودع.');
  process.exit(1);
}

const rows = [];
for (const file of readdirSync(SHEETS).filter((f) => /^0\d-.*\.html$/.test(f)).sort()) {
  for (const screen of screens(readFileSync(join(SHEETS, file), 'utf8'))) {
    const route = ROUTES[screen.number];
    if (!route) continue;

    const want = requirements(screen.slice);
    if (want.length === 0) continue;

    const live = liveSource(route);
    const missing = want.filter((r) => !live.includes(r.text));
    rows.push({ ...screen, route, total: want.length, missing });
  }
}

if (rows.length === 0) {
  console.error('✖ لم تُطابق أي شاشة مساراً. راجع ROUTES.');
  process.exit(1);
}

const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - [...String(s)].length));
console.log(`${pad('#', 5)}${pad('الشاشة', 26)}${pad('موجود/مطلوب', 16)}النسبة`);
console.log('─'.repeat(60));

let totalWant = 0;
let totalHave = 0;
for (const row of rows) {
  const have = row.total - row.missing.length;
  totalWant += row.total;
  totalHave += have;
  const share = Math.round((100 * have) / row.total);
  const mark = row.missing.length === 0 ? '✓' : '✖';
  console.log(`${pad(row.number, 5)}${pad(row.title.slice(0, 24), 26)}${pad(`${have}/${row.total}`, 16)}${share}% ${mark}`);
}

console.log('─'.repeat(60));
const overall = totalHave / totalWant;
console.log(`${pad('الإجمالي', 31)}${pad(`${totalHave}/${totalWant}`, 16)}${Math.round(overall * 100)}%\n`);

for (const row of rows.filter((r) => r.missing.length > 0)) {
  console.log(`■ ${row.number} ${row.title} — ${row.route}`);
  for (const item of row.missing) console.log(`    ناقص ${item.kind}: «${item.text}»`);
  console.log('');
}

const regressed = [];
const improved = [];
for (const row of rows) {
  const have = row.total - row.missing.length;
  const floor = RATCHET[row.number];
  if (floor === undefined) continue;
  if (have < floor) regressed.push({ row, have, floor });
  if (have > floor) improved.push({ row, have, floor });
}

if (regressed.length > 0) {
  console.error('✖ تراجعت مطابقة التصميم:\n');
  for (const { row, have, floor } of regressed) {
    console.error(`  ${row.number} ${row.title}: ${have} عنصراً، والمطلوب ${floor} على الأقل.`);
  }
  console.error('\n  الصفيحة المعتمدة في docs/design/src هي المرجع، لا الصورة.');
  process.exit(1);
}

if (improved.length > 0) {
  console.error('✖ تقدّمت شاشات — ارفع السقّاطة في RATCHET:\n');
  for (const { row, have, floor } of improved) {
    console.error(`  ${row.number}: ${floor} → ${have}`);
  }
  process.exit(1);
}

const done = rows.filter((r) => r.missing.length === 0).length;
console.log(
  `✓ مطابقة التصميم ${Math.round(overall * 100)}% — ${done}/${rows.length} شاشة مكتملة، ولا تراجع.`,
);
