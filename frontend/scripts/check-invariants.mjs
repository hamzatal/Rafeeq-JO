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

/* ── 6. A fetch that can fail has a failure branch ───────────────────────────
 *
 * `admin-dashboard/src/components/LoadError.tsx` was written for exactly this bug and
 * its own docblock names it: "Six pages fetched with `.then(setItems).finally(…)` and
 * no `.catch()`… the page rendered its EMPTY state." Nineteen of the twenty-four
 * `(dashboard)` pages then never imported it.
 *
 * An empty state is a CLAIM ABOUT THE DATA. On `/withdrawals` the claim is "there are
 * no pending payouts", which an operator acts on by going home. Gate 4 is the RN side
 * of this invariant; this is the web side.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  for (const file of walk(resolve(ROOT, 'admin-dashboard/app'))) {
    const src = code(readFileSync(file, 'utf8'));

    /*
     * Split into STATEMENTS first, then ask each one whether it handles failure.
     *
     * Two earlier versions of this scan were wrong in opposite ways, and both produced
     * false positives — which is how a gate gets deleted rather than obeyed:
     *
     *   • stopping at the next `;` cut `.then((p) => { setA(p); setB(p); }).catch(…)`
     *     in half, so four already-correct files were reported;
     *   • walking forward from `api.` broke on `Promise.all([api.a(), api.b()]).catch(…)`,
     *     because the inner call's scan hits `]` and ends before the `.catch`.
     *
     * A statement is the unit that either has a failure branch or does not, so that is
     * the unit to test.
     *
     * Depth counts `(` and `[` ONLY, not `{`. Counting braces made every line inside a
     * component body depth ≥ 1 — so the whole component was one "statement", and one
     * `.catch` anywhere in the file cleared every chain in it. That is the third way to
     * get this wrong, and the quietest: the gate reported zero.
     */
    const statements = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < src.length; i += 1) {
      const ch = src[i];
      if ('(['.includes(ch)) depth += 1;
      else if (')]'.includes(ch)) depth -= 1;
      else if (ch === ';' && depth <= 0) {
        statements.push([from, src.slice(from, i)]);
        from = i + 1;
      }
    }

    for (const [offset, statement] of statements) {
      if (!statement.includes('api.') || !statement.includes('.then(')) continue;
      if (statement.includes('.catch(')) continue;
      findings.push(`${relative(ROOT, file)}:${src.slice(0, offset).split('\n').length + 1}`);
    }
  }
  gate(
    'fetch-without-catch',
    'a rejected promise leaves the page on its EMPTY state, which asserts the data is empty. Add .catch(() => setLoadError(true)) and render <LoadError onRetry={load}/> before the length===0 branch.',
    findings,
  );
}

/* ── 7. No hardcoded locale in a formatter ───────────────────────────────────
 *
 * `toLocaleString('en-US')` on an Arabic RTL dashboard freezes the grouping separator
 * while the date beside it is locale-aware, so one card shows both conventions.
 * `toLocaleString('ar')` is worse: `'ar'` without a region resolves to the Arabic ROOT
 * locale, whose default calendar in several ICU builds is islamic — so a Hijri date can
 * appear beside a Gregorian one, and did, on the PDF receipt a user keeps.
 *
 * An empty argument list is the third shape: it follows the OS, so the audit log was the
 * one table whose date format depended on the reader's laptop.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  for (const app of ['student-app', 'driver-app', 'admin-dashboard', 'packages']) {
    for (const file of walk(resolve(ROOT, app))) {
      const raw = readFileSync(file, 'utf8');
      const src = code(raw);
      for (const m of src.matchAll(/\.toLocale(?:Date|Time)?String\(\s*[,)]/g)) {
        findings.push(`${relative(ROOT, file)}:${raw.slice(0, m.index).split('\n').length}  (no locale — follows the OS)`);
      }
      /*
       * A literal locale. `code()` blanks strings, so the argument is invisible there —
       * the scan runs on the raw source and then confirms there is real code under the
       * match, which is what keeps a comment naming the bug from failing the gate.
       */
      for (const m of raw.matchAll(/\.toLocale(?:Date|Time)?String\(\s*['"][a-zA-Z][\w-]*['"]/g)) {
        if (src.slice(m.index, m.index + 12).trim() === '') continue;
        findings.push(`${relative(ROOT, file)}:${raw.slice(0, m.index).split('\n').length}  ${m[0].trim()}`);
      }
    }
  }
  gate(
    'hardcoded-locale',
    "pass the user's locale: `toLocaleString(locale)` from useT()/useI18n(), or getApiLocale() inside packages/ui.",
    findings,
  );
}

/* ── 8. Every table has an accessible name ───────────────────────────────────
 *
 * `scope="col"` (gate 2) tells a screen reader which column a cell belongs to. It does
 * not say WHICH TABLE the reader is in. All 24 admin tables had no `<caption>`, so
 * tabbing into `/withdrawals` announced "table, 6 columns" and nothing else.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  for (const file of walk(resolve(ROOT, 'admin-dashboard'))) {
    const src = code(readFileSync(file, 'utf8'));
    const tables = (src.match(/<table\b/g) ?? []).length;
    const captions = (src.match(/<caption\b/g) ?? []).length;
    if (tables > captions) {
      findings.push(`${relative(ROOT, file)}  ${tables} table(s), ${captions} caption(s)`);
    }
  }
  gate('table-without-caption', 'add <caption className="sr-only">{…}</caption> as the table\'s first child so it has a name.', findings);
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
