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
    fix: 'use formatFils / formatDinars / dinarsFromFils from @rafeeq/shared',
  },
  {
    id: 'raw-currency',
    re: /د\.أ/,
    why: 'a hand-written currency symbol has no bidi isolation, so the number and symbol can reorder',
    fix: 'use formatFils / formatDinars, or the DINAR constant, from @rafeeq/shared',
  },
  {
    id: 'hand-rolled-fils',
    re: /\/\s*1000\s*\)\s*\.toFixed\(/,
    why: 'converting fils to dinars by hand bypasses the single formatter',
    fix: 'use formatFils / dinarsFromFils from @rafeeq/shared',
  },
];

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
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments may describe the defect
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
