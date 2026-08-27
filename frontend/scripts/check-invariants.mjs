#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Structural invariants — the four things phase 7 established that a future
   commit could quietly undo.

   These are all HARD ZEROS, unlike the budgets in `check-design-tokens.mjs`.
   That difference is deliberate: a budget exists when the debt is real and being
   paid down over several phases. These four are at zero TODAY, so asserting zero
   costs nothing and the first regression is caught by the person who caused it.

   Every check strips comments first. The version of the icon-button scan that did
   not matched the word `<Pressable>` inside a comment explaining why something was
   NOT a Pressable — a gate that fails on its own documentation gets deleted.
   ═══════════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.expo', '.next', 'dist', 'build', 'android', 'ios']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }

  return out;
}

/**
 * Blank out comments and string literals, keeping byte offsets so line numbers
 * still line up.
 *
 * Strings go too: `'<Pressable>'` in an error message is not a pressable, and the
 * JSX-shape scans below cannot tell the difference.
 */
function code(src) {
  let out = '';
  let i = 0;

  while (i < src.length) {
    const two = src.slice(i, i + 2);

    if (two === '//') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
      continue;
    }
    if (two === '/*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1).replace(/[^\n]/g, ' ');
      i = j + 1;
      continue;
    }
    out += ch;
    i += 1;
  }

  return out;
}

const failures = [];
const results = [];

function gate(id, why, findings) {
  results.push({ id, count: findings.length });
  if (findings.length > 0) failures.push({ id, why, findings });
}

/* ── 1. Every icon-only control has a spoken name ────────────────────────────
 *
 * 28 pressables had an icon as their only child and no `accessibilityLabel`, and
 * `accessibilityLabel` appeared ZERO times in either app. To a screen reader each
 * announced as "button" and nothing more: the back arrow on every header, the send
 * button in chat, the close on every sheet, the SOS control.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  for (const app of ['student-app', 'driver-app', 'packages/ui']) {
    for (const file of walk(resolve(ROOT, app))) {
      const src = code(readFileSync(file, 'utf8'));
      for (const m of src.matchAll(/<(Pressable|PressableScale|TouchableOpacity)\b/g)) {
        const open = src.slice(m.index, m.index + 1200);
        const close = open.indexOf(`</${m[1]}>`);
        const body = close === -1 ? open : open.slice(0, close);
        if (body.includes('<Icon') && !body.includes('<Text') && !body.includes('accessibilityLabel')) {
          findings.push(`${relative(ROOT, file)}:${src.slice(0, m.index).split('\n').length}`);
        }
      }
    }
  }
  gate(
    'unlabelled-icon-button',
    'a pressable whose only child is an icon has NO accessible name. Use `IconButton` from @rafeeq/ui, which requires the label, or add accessibilityRole="button" + accessibilityLabel.',
    findings,
  );
}

/* ── 2. Every admin table header declares its scope ──────────────────────────
 *
 * 156 `<th>` had none. Without `scope`, a screen reader cannot associate a cell
 * with its column, so a 9-column payouts table reads as 9 unlabelled numbers per
 * row — which is the same as not having a table.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  for (const file of walk(resolve(ROOT, 'admin-dashboard'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/<th(?!ead)(\s[^>]*)?>/g)) {
      if (!m[0].includes('scope=')) {
        findings.push(`${relative(ROOT, file)}:${src.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  gate('th-without-scope', 'add scope="col" (or "row") so a screen reader can associate cells with headers.', findings);
}

/* ── 3. The layers point one way ─────────────────────────────────────────────
 *
 * `@rafeeq/ui` reaches `react-native`. Phase 6 already proved what that does to a
 * Next.js build: re-exporting a `lucide-react-native` registry from the tokens
 * barrel typechecked on all six workspaces and then failed `next build` on Flow
 * syntax inside `react-native/index.js`.
 *
 * The reverse direction is the one that created the duplication in the first
 * place — a shared file reaching for an app's store, which forced the file to be
 * copied so the store could differ.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  for (const file of walk(resolve(ROOT, 'admin-dashboard'))) {
    const src = code(readFileSync(file, 'utf8'));
    if (/from\s+['"]@rafeeq\/ui/.test(src) || /from\s+['"]react-native['"]/.test(src)) {
      findings.push(`${relative(ROOT, file)}  (admin must not reach the Expo layer)`);
    }
  }
  for (const file of walk(resolve(ROOT, 'packages'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/from\s+['"]([^'"]*(?:student-app|driver-app|admin-dashboard)[^'"]*)['"]/g)) {
      findings.push(`${relative(ROOT, file)}  imports ${m[1]}`);
    }
  }
  gate('layer-violation', 'admin-dashboard is a Next.js app and must not import @rafeeq/ui or react-native; packages must not import an app.', findings);
}

/* ── 4. No empty state without an error branch ───────────────────────────────
 *
 * An empty state is a CLAIM ABOUT THE DATA — "there is nothing here" — and it is
 * only true when the request succeeded. Seven screens rendered it on failure,
 * including the wallet ledger («لا معاملات» when the history simply did not load)
 * and the emergency-contacts list.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  for (const app of ['student-app', 'driver-app']) {
    for (const file of walk(resolve(ROOT, app))) {
      const src = code(readFileSync(file, 'utf8'));
      if (!src.includes('EmptyState')) continue;
      if (src.includes('ListState') || src.includes('ErrorState')) continue;
      findings.push(relative(ROOT, file));
    }
  }
  gate(
    'empty-without-error',
    'a screen that can render EmptyState must also handle failure. Use <ListState status={…}> — it cannot reach "empty" without a successful load.',
    findings,
  );
}

/* ── 5. The two apps share no duplicated file ────────────────────────────────
 *
 * Nine files were byte-identical across the two `src/` trees — 1,128 lines,
 * including a 510-line `LiveMap` twice. The cost was not the bytes: it was that
 * nothing compared them, so both tab bars broke the same approved decision in two
 * different ways and neither was right.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  const student = resolve(ROOT, 'student-app/src');
  for (const file of walk(student)) {
    const twin = resolve(ROOT, 'driver-app/src', relative(student, file));
    try {
      if (readFileSync(file, 'utf8') === readFileSync(twin, 'utf8')) {
        findings.push(`${relative(ROOT, file)} === ${relative(ROOT, twin)}`);
      }
    } catch {
      /* no twin — which is the normal case now */
    }
  }
  gate('duplicated-app-file', 'this file is identical in both apps. Move it to packages/ui and pass the difference in as an argument.', findings);
}

/* ── report ─────────────────────────────────────────────────────────────────── */

console.log('\nstructural invariants\n');
for (const r of results) {
  const mark = r.count === 0 ? '✓' : '✗';
  console.log(`  ${mark} ${r.id.padEnd(24)} ${String(r.count).padStart(3)}  (must be 0)`);
}

if (failures.length === 0) {
  console.log('\ninvariants: all hold\n');
  process.exit(0);
}

for (const f of failures) {
  console.error(`\n✗ ${f.id} — ${f.findings.length}\n`);
  console.error(`  ${f.why}\n`);
  for (const hit of f.findings.slice(0, 25)) console.error(`    ${hit}`);
  if (f.findings.length > 25) console.error(`    … and ${f.findings.length - 25} more`);
}
console.error('');
process.exit(1);
