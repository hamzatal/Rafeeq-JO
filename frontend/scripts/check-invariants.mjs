#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Structural invariants — what a future commit could quietly undo.


   These are all HARD ZEROS, unlike the budgets in `check-design-tokens.mjs`.
   That difference is deliberate: a budget exists when the debt is real and being
   paid down over several phases. These four are at zero TODAY, so asserting zero
   costs nothing and the first regression is caught by the person who caused it.

   Every check strips comments first. The version of the icon-button scan that did
   not matched the word `<Pressable>` inside a comment explaining why something was
   NOT a Pressable — a gate that fails on its own documentation gets deleted.
   ═══════════════════════════════════════════════════════════════════════════ */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localeMismatches, missingKeys, unreadKeys } from './lib/i18n-keys.mjs';

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

/* ── 5. The two apps share no duplicated screen ──────────────────────────────
 *
 * Nine files were byte-identical across the two `src/` trees — 1,128 lines,
 * including a 510-line `LiveMap` twice. The cost was not the bytes: it was that
 * nothing compared them, so both tab bars broke the same approved decision in two
 * different ways and neither was right.
 *
 * ── Both ways this check used to be blind ───────────────────────────────────
 *
 * It compared BYTES, under `src/` ONLY. So it reported zero while eight pairs of
 * route files sat under `app/`, and it would have kept reporting zero if they had
 * been reformatted:
 *
 *   app/_layout.tsx        115 + 109 lines whose only difference was WHITESPACE
 *   (app)/chat.tsx         161 + 161, byte-identical
 *   (onboarding)/permissions.tsx  169 + 168, two differing lines
 *   (auth)/login.tsx       107 + 109, and the two had already drifted into
 *                          validating a phone number differently
 *
 * Byte equality is the wrong test because the interesting case is the NEAR-copy:
 * that is where the two versions have started to disagree, and disagreement is the
 * actual defect. So this now compares under `app/` too, and on similarity.
 *
 * ── What an identical file is ALLOWED to be ─────────────────────────────────
 *
 * After extraction, several files are identical and correctly so:
 *
 *   • both `(auth)/forgot-password.tsx` are the same ten lines, because nothing is
 *     left to differ — they delegate to one shared screen,
 *   • both `app/_layout.tsx` are the same 38 lines, and every `../src/…` import in
 *     them resolves to a DIFFERENT module,
 *   • both `src/i18n.tsx` bind the shared provider to their own prefs store, which
 *     is the one thing a package cannot import for itself.
 *
 * Those are the fix, not the problem. What separates them from a duplicated screen
 * is that they carry no implementation — and the cheapest reliable proxy for
 * implementation is `StyleSheet.create`. A screen has styles; a binding does not.
 *
 * A duplicated screen with no styles would slip through, which is the known cost of
 * the proxy. It is a much smaller cost than the alternative: a gate that fires on
 * every correct delegation is a gate that gets an exceptions list, and then the
 * exceptions list is where the next real duplicate hides.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const MIN_LINES = 25;
  const SIMILARITY = 0.85;
  const findings = [];

  /** Fraction of the smaller file's non-trivial lines that appear in the larger. */
  const similarity = (a, b) => {
    const trim = (src) =>
      src
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 3);
    const [x, y] = [trim(a), trim(b)];
    if (x.length === 0 || y.length === 0) return 0;
    const pool = new Map();
    for (const line of y) pool.set(line, (pool.get(line) ?? 0) + 1);
    let shared = 0;
    for (const line of x) {
      const left = pool.get(line) ?? 0;
      if (left > 0) {
        shared += 1;
        pool.set(line, left - 1);
      }
    }

    return shared / Math.min(x.length, y.length);
  };

  for (const tree of ['src', 'app']) {
    const base = resolve(ROOT, 'student-app', tree);
    for (const file of walk(base)) {
      const twin = resolve(ROOT, 'driver-app', tree, relative(base, file));
      let a, b;
      try {
        a = readFileSync(file, 'utf8');
        b = readFileSync(twin, 'utf8');
      } catch {
        continue; /* no twin — the normal case */
      }
      if (a.split('\n').length < MIN_LINES && b.split('\n').length < MIN_LINES) continue;
      // No styles means no screen — see the note above.
      if (!a.includes('StyleSheet.create(') && !b.includes('StyleSheet.create(')) continue;
      const ratio = similarity(a, b);
      if (ratio >= SIMILARITY) {
        findings.push(
          `${relative(ROOT, file)} ≈ ${relative(ROOT, twin)}  (${Math.round(ratio * 100)}% identical)`,
        );
      }
    }
  }
  gate(
    'duplicated-app-file',
    `these two files are ≥${SIMILARITY * 100}% the same. Move the screen to packages/ui/src/screens and pass the difference in as an argument — a near-copy is where the two apps quietly stop agreeing.`,
    findings,
  );
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

/* ── 6b. One <h1> per page: a tab body is not a page ─────────────────────────
 *
 * `TabbedPage` renders the destination's heading from `nav.ts`. Every one of the sixteen
 * views it renders BELOW that heading also rendered its own `<h1>` — so each tabbed
 * destination shipped two level-one headings, the second either repeating the first
 * («الدعم» under «الدعم والشكاوى») or contradicting it («الأمان — المصادقة الثنائية»
 * under «الأمان والتدقيق»).
 *
 * That is a WCAG 1.3.1 problem, not a styling one: heading level communicates document
 * structure, a screen-reader user navigating by heading lands on a duplicate, and the
 * two competed at the same visual weight so neither read as the page title. Views use
 * `<h2 className="section-title">` now.
 *
 * Scoped to `src/views`, which is exactly the set of files rendered inside a shell that
 * already owns the `<h1>`. Pages under `app/` legitimately have one.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = [];
  const views = resolve(ROOT, 'admin-dashboard/src/views');
  if (existsSync(views)) {
    for (const file of walk(views)) {
      const raw = readFileSync(file, 'utf8');
      const src = code(raw);
      for (const m of src.matchAll(/<h1[\s>]/g)) {
        findings.push(`${relative(ROOT, file)}:${raw.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  gate(
    'view-owns-h1',
    'a view rendered inside TabbedPage must not draw its own <h1> — the shell already did. Use <h2 className="section-title">.',
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

/* ── 9. Every translation key the apps ask for actually exists ───────────────
 *
 * `t()` returns the KEY when it cannot resolve one (`i18n/index.ts`), so a missing
 * key is not a crash and not a type error — it is a screen calmly showing
 * `driver.statusPending` to a captain. Nothing failed when phase 8.9 deleted 42
 * live keys: the receipt PDF printed `payments.receiptHeading` as its title and
 * the crash screen was headed `common.crashTitle`.
 *
 * All 42 were reached through a lookup table (`{ key: 'driver.statusPending' }`)
 * rather than a literal `t('…')`, which is exactly what the dead-key detector
 * could not see. This gate and that detector now share one collector — see
 * `scripts/lib/i18n-keys.mjs` — so "dead" and "missing" are inverses by
 * construction instead of by coincidence.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const findings = missingKeys().map(
    ({ key, sites }) => `${key}  ← ${sites.slice(0, 2).join(', ')}${sites.length > 2 ? ` (+${sites.length - 2})` : ''}`,
  );
  gate(
    'missing-translation-key',
    'the apps ask for these and ar.ts does not have them, so t() renders the key itself. Add them to BOTH ar.ts and en.ts, or stop referencing them.',
    findings,
  );
}

/* ── 10. And no key nothing asks for ────────────────────────────────────────
 *
 * The other half of gate 9, and the reason it is here rather than in a one-off
 * script: the 188-key deletion was performed by a script that was RUN and never
 * committed, so the judgement it encoded could not be reviewed, re-run, or
 * corrected — it just landed. A dead key is cheap on its own; a dead key nobody
 * can re-detect is how the dictionary drifts from the app in both directions.
 *
 * A dead translation is also the SHAPE of a feature. Sixteen keys describing a
 * services-grid home screen outlived the screen, and the next person builds
 * around the string instead of around the data.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  gate(
    'dead-translation-key',
    'nothing reads these. Delete them from ar.ts and en.ts, or wire them up — a key kept "for later" is a feature that looks half-built.',
    unreadKeys(),
  );
}

/* ── 11. The two dictionaries carry the same keys ────────────────────────────
 *
 * `en.ts` is typed as `Translations` derived from `ar.ts`, so a key missing from
 * `en.ts` is a compile error — but an EXTRA key in `en.ts` is not, and that asymmetry
 * is how a locale quietly grows a phantom.
 *
 * Parity was asserted only by `I18nContractTest`, which lives in the BACKEND CI job
 * and skips when the frontend tree is not checked out. Splitting one contract across
 * two runners with two skip conditions is a milder version of the fault that caused
 * the 42-key incident: two implementations of one question.
 * ─────────────────────────────────────────────────────────────────────────── */
{
  gate(
    'locale-key-mismatch',
    'ar.ts and en.ts must carry exactly the same keys. Add the missing side, or delete the extra one.',
    localeMismatches(),
  );
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
