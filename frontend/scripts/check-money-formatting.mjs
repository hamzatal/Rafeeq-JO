#!/usr/bin/env node
/**
 * CI gate: money may only become text through @rafeeq/shared.
 *
 * Two defects this stops from coming back, both of which were live in production:
 *
 *   `toFixed(2)` on a dinar amount. A dinar is 1000 fils, so two decimals do not
 *   drop a trailing zero — they round, and display a different amount than the one
 *   stored. 1999 fils rendered as "2.00". Twelve call sites had it, including the
 *   two pages where an operator sets prices.
 *
 *   A literal "د.أ" pasted next to a number. There was no bidi isolation anywhere
 *   in any of the three clients, so a negative amount could render as "1.050-" and
 *   the currency could land on the wrong side of the number.
 *
 * Runs on the whole frontend. Exits non-zero with file:line for every hit.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const SKIP_DIRS = new Set(['node_modules', '.next', '.expo', 'dist', 'build', '.git', 'coverage']);
// The formatter itself, its tests, and the translation catalogue are allowed the literals.
const ALLOW_FILES = [
  'packages/shared/src/utils/money.ts',
  'packages/shared/src/utils/money.test.ts',
  'packages/shared/src/i18n/ar.ts',
  'packages/shared/src/i18n/en.ts',
  'admin-dashboard/src/lib/i18n.ts',
  'frontend/scripts/check-money-formatting.mjs',
];

const RULES = [
  {
    id: 'two-decimals',
    re: /\.toFixed\(\s*2\s*\)/,
    why: 'a dinar is 1000 fils, so amounts need 3 decimals — toFixed(2) rounds and shows a different amount',
    fix: 'use formatJod(fils) from @rafeeq/shared',
  },
  {
    id: 'raw-currency',
    re: /د\.أ/,
    why: 'a hand-written currency symbol has no bidi isolation, so the number and symbol can reorder',
    fix: 'use formatJod(fils), or the DINAR constant, from @rafeeq/shared',
  },
  {
    id: 'hand-rolled-fils',
    re: /\/\s*1000\s*\)\s*\.toFixed\(/,
    why: 'converting fils to dinars by hand bypasses the single formatter',
    fix: 'use formatJod(fils) or bareJod(fils) from @rafeeq/shared',
  },

  /*
   * ── The three rules below were added after the gate missed real bugs ────────
   *
   * The gate above catches `.toFixed(2)` and a hand-written «د.أ». Both admin
   * dashboards had shipped this instead:
   *
   *   const jod = (fils) => `${(fils / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
   *
   * which drops ALL THREE decimals from the platform's own revenue figure — so
   * 1,234,999 fils displayed as "1,235", a full dinar high — and produces a bare
   * numeral with no bidi isolation inside an RTL page. It used neither `toFixed`
   * nor «د.أ», so it passed. Four other screens interpolated a `*_jod` field
   * straight into JSX, printing "4.5" where a dinar is always three decimals.
   *
   * A gate that only catches the mistakes you already made is a gate that has
   * stopped working.
   */
  {
    id: 'fils-division',
    re: /\/\s*1000\b(?![\s\S]{0,40}from '@rafeeq\/shared')/,
    why: 'dividing by 1000 by hand converts fils to dinars outside the one formatter',
    fix: 'use formatJod(fils) or bareJod(fils) from @rafeeq/shared',
    // The formatter itself and the two places that legitimately scale a fils value
    // are allowed by ALLOW_LINE below.
  },
  {
    id: 'rounded-money',
    re: /maximumFractionDigits:\s*[012]\b/,
    why: 'a dinar has three decimals; rounding to fewer displays an amount that is not the stored one',
    fix: 'use formatJod(fils) from @rafeeq/shared',
  },
  {
    id: 'raw-jod-field',
    re: /\{\s*[\w.?]*(amount|price|balance|available|fare|total)_jod\s*\}/i,
    why: 'a *_jod field interpolated straight into JSX prints "4.5" instead of "4.500", unisolated',
    fix: 'read the matching *_fils field and pass it to formatJod — there is no decimal-dinar formatter any more',
  },
  {
    id: 'latin-currency',
    re: /['"`]\s*JOD\s+?['"`]|>\s*JOD\s*</,
    why: 'the currency reads «د.أ» in both locales; a hardcoded Latin "JOD" is unlocalised and inconsistent',
    fix: 'use the DINAR constant from @rafeeq/shared',
  },

  /*
   * The DELETED names.
   *
   * `money.ts` used to export seven formatters split by input unit — four of them
   * taking decimal dinars. They were deleted rather than deprecated, because
   * `formatDinars(1.999)` and `formatJod(1999)` print the same string from arguments
   * a thousand times apart, and no reviewer can tell a mistake from an intent.
   *
   * This rule exists because deletion alone does not hold: the API still returns the
   * `*_jod` mirror, so the next screen that needs a decimal formatter will write one
   * locally and call it the obvious thing. Naming the old names keeps the door shut.
   */
  {
    id: 'decimal-dinar-formatter',
    re: /\b(formatDinars|formatDinarsSigned|dinarsOf|formatFils|formatFilsSigned)\s*\(/,
    why: 'these took decimal dinars or were aliases for the fils functions; the split input unit is what made the wrong pairing silent',
    fix: 'read the *_fils field and use formatJod / formatJodSigned / bareJod',
  },
];

/**
 * Lines that may keep a raw `/ 1000`.
 *
 * Narrow and explicit rather than a whole-file exemption: each is a fils value being
 * scaled for a formatter that takes dinars, which is the one legitimate reason to
 * write the division at a call site.
 */
const ALLOW_LINE = [
  /dinarsFromFils/, // the shared helper's own name

  /*
   * A form INPUT bound to a `*_jod` value.
   *
   * An editable field must hold the raw number the operator is typing — formatting
   * it to three decimals on every keystroke makes it impossible to type "4.5",
   * because the value becomes "4.500" before the second digit arrives. Display is
   * formatted; input is not. The `value=` prefix is what distinguishes them.
   */
  /value=\{[^}]*_jod\}/,
];

/**
 * A comment cannot render, so it cannot mis-display money.
 *
 * The rules above are deliberately blunt regexes, which means an explanatory
 * comment that NAMES the mistake — "not a hardcoded «د.أ»" — trips the very rule it
 * is documenting. Skipping comment lines keeps the gate honest without forcing the
 * comments to talk around their own subject.
 */
const COMMENT = /^\s*(\/\/|\/\*|\*|\{\/\*)/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (ALLOW_FILES.some((a) => rel === a || a.endsWith(rel))) continue;

  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Comments may describe the defect. `COMMENT` also covers a JSX `{/* … */}`
    // block, which the previous pattern missed — so a JSX comment explaining why a
    // hardcoded «د.أ» is wrong was itself reported as a hardcoded «د.أ».
    if (COMMENT.test(line)) return;
    if (ALLOW_LINE.some((a) => a.test(line))) return;

    for (const rule of RULES) {
      if (rule.re.test(line)) hits.push({ rel, line: i + 1, rule, text: line.trim().slice(0, 100) });
    }
  });
}

if (hits.length === 0) {
  console.log('money formatting: clean — every amount goes through @rafeeq/shared');
  process.exit(0);
}

console.error(`\nmoney formatting: ${hits.length} violation(s)\n`);
for (const h of hits) {
  console.error(`  ${h.rel}:${h.line}  [${h.rule.id}]`);
  console.error(`    ${h.text}`);
  console.error(`    why: ${h.rule.why}`);
  console.error(`    fix: ${h.rule.fix}\n`);
}
process.exit(1);
