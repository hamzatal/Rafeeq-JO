#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Generate every non-TypeScript consumer of the design tokens.

   ── What this exists to prevent ────────────────────────────────────────────

   Before phase 6 there were FOUR hand-written sources of the same values, and
   they had already drifted:

     • kit.css said `--r-card: 16px`; the admin's `.card` said `rounded-xl` (12)
     • kit.css said `--h-ctl: 46px`; the admin's `.btn` said `h-11` (44)
     • kit.css tinted shadows `rgba(18,47,107,…)`; React Native tinted them
       `#002045`, a navy from an identity deleted two phases earlier
     • `scheme.ts` had no b300/b400/b500/b900; Tailwind had them but was missing
       every `*-soft` semantic tint

   None of those were caught by review, because nothing compared the four files.
   Now three of them are OUTPUT, and `--check` (run in CI as `check:tokens`)
   regenerates and diffs. A hand edit to kit.css fails the build with the exact
   line that drifted, instead of quietly becoming a fifth truth.

   Usage:
     node scripts/build-tokens.mjs           # write
     node scripts/build-tokens.mjs --check   # verify, exit 1 on drift
   ═══════════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO = resolve(FRONTEND, '..');

const CHECK = process.argv.includes('--check');

/*
 * The tokens are TypeScript, and this is a plain Node script — so rather than
 * add a build step or a TS loader just to read six constant objects, the values
 * are parsed out of the source with a narrow reader.
 *
 * That sounds fragile, and it would be if it guessed. It does not: it reads the
 * exact `export const` blocks by name and throws if one is missing or malformed,
 * so a rename breaks this loudly at generate time rather than emitting a file
 * with a hole in it.
 */
function readTokenObject(file, exportName) {
  const src = readFileSync(resolve(FRONTEND, 'packages/tokens/src', file), 'utf8');
  const start = src.indexOf(`export const ${exportName} = {`);
  if (start === -1) {
    throw new Error(`build-tokens: cannot find \`export const ${exportName}\` in ${file}. ` +
      'If it was renamed, update this generator — a silently missing token would ship an empty CSS variable.');
  }

  const open = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`build-tokens: unbalanced braces reading ${exportName}`);

  const body = src.slice(open + 1, end);
  const out = {};
  // key: 'value'  |  key: "value"  |  key: 123  |  'key': 'value'  |  50: '#fff'
  const re = /(?:^|\n)\s*'?([\w-]+)'?\s*:\s*(?:'([^']*)'|"([^"]*)"|([\d.]+))\s*,/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out[m[1]] = m[2] ?? m[3] ?? (m[4] !== undefined ? Number(m[4]) : undefined);
  }
  if (Object.keys(out).length === 0) {
    throw new Error(`build-tokens: parsed ${exportName} but found no entries`);
  }

  return out;
}

const brand = readTokenObject('color.ts', 'brand');
const neutral = readTokenObject('color.ts', 'neutral');
const live = readTokenObject('color.ts', 'live');
const status = readTokenObject('color.ts', 'status');
const radius = readTokenObject('space.ts', 'radius');
const size = readTokenObject('space.ts', 'size');
const space = readTokenObject('space.ts', 'space');
const layer = readTokenObject('space.ts', 'layer');

/** `#122F6B` → `18,47,107`, for the shadow tints kit.css writes as rgba(). */
function rgbTriplet(hex) {
  const h = hex.replace('#', '');

  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
}

const SHADOW_RGB = rgbTriplet(brand[900]);

const BANNER = `/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GENERATED FILE — DO NOT EDIT.                                            ║
   ║                                                                           ║
   ║  Source:    frontend/packages/tokens/src/*.ts                             ║
   ║  Regenerate: cd frontend && npm run build:tokens                          ║
   ║                                                                           ║
   ║  CI runs \`npm run check:tokens\`, which regenerates and diffs. A hand edit  ║
   ║  here fails the build — because four hand-written copies of these values   ║
   ║  is exactly how the card radius came to differ by 4px between the design   ║
   ║  source, the apps and the dashboard.                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */`;

/* ── 1 · the token block of kit.css ─────────────────────────────────────────
   Only the `:root` block is generated. Everything below it in kit.css is
   component CSS for the mockup generators, which is hand-written and should be —
   it is a drawing tool, not a product surface. The markers let the generator
   replace precisely its own region. */
function kitCssRoot() {
  const line = (pairs) => pairs.map(([k, v]) => `--${k}:${v};`).join(' ');

  return [
    '/* @generated:tokens:start — see frontend/packages/tokens */',
    ':root{',
    '  /* brand ramp */',
    `  ${line(Object.entries(brand).map(([k, v]) => [`b${k}`, v]))}`,
    '  /* the one second colour: destination + live (decision 13) */',
    `  ${line([['live', live.base], ['live-soft', live.soft]])}`,
    '  /* neutrals */',
    `  ${line(Object.entries(neutral).slice(0, 7).map(([k, v]) => [`n${k}`, v]))}`,
    `  ${line(Object.entries(neutral).slice(7).map(([k, v]) => [`n${k}`, v]))}`,
    '  /* status */',
    `  ${line([
      ['ok', status.success], ['ok-soft', status.successSoft],
      ['bad', status.danger], ['bad-soft', status.dangerSoft],
      ['warn', status.warning], ['warn-soft', status.warningSoft],
    ])}`,
    '  /* radii — three, on purpose */',
    `  ${line([['r-ctl', `${radius.control}px`], ['r-card', `${radius.card}px`], ['r-sheet', `${radius.sheet}px`]])}`,
    '  /* elevation, tinted with the brand\'s deepest tone */',
    `  --sh-md:0 4px 12px rgba(${SHADOW_RGB},.08), 0 1px 3px rgba(${SHADOW_RGB},.06);`,
    `  --sh-lg:0 12px 32px rgba(${SHADOW_RGB},.12), 0 4px 8px rgba(${SHADOW_RGB},.06);`,
    '  /* density */',
    `  ${line([
      ['gutter', `${size.gutter}px`], ['card-pad', `${size.cardPad}px`],
      ['row-pad', `${size.rowPad}px`], ['h-ctl', `${size.control}px`], ['h-tab', `${size.tabBar}px`],
    ])}`,
    '  /* spacing scale */',
    `  ${line(Object.entries(space).map(([k, v]) => [`s-${k}`, `${v}px`]))}`,
    '  /* stacking order — these were raw z-index numbers before */',
    `  ${line(Object.entries(layer).map(([k, v]) => [`z-${k}`, v]))}`,
    '}',
    '/* @generated:tokens:end */',
  ].join('\n');
}

const outputs = [];

// kit.css — surgical replacement of the marked region.
{
  const path = resolve(REPO, 'docs/design/src/kit.css');
  const current = readFileSync(path, 'utf8');
  const START = '/* @generated:tokens:start';
  const END = '/* @generated:tokens:end */';

  let next;
  if (current.includes(START)) {
    const a = current.indexOf(START);
    const b = current.indexOf(END) + END.length;
    next = current.slice(0, a) + kitCssRoot() + current.slice(b);
  } else {
    // First run: replace the hand-written :root{...} block.
    const a = current.indexOf(':root{');
    if (a === -1) throw new Error('build-tokens: kit.css has no :root block to replace');
    const b = current.indexOf('}', a) + 1;
    next = current.slice(0, a) + kitCssRoot() + current.slice(b);
  }
  outputs.push([path, next]);
}

// The Tailwind config — a thin file that spreads the preset and adds `content`.
{
  const path = resolve(FRONTEND, 'admin-dashboard/tailwind.config.ts');
  outputs.push([path, `${BANNER}
import type { Config } from 'tailwindcss';
import { tailwindPreset } from '@rafeeq/tokens';

/*
 * Everything visual comes from the preset. This file exists only to tell
 * Tailwind which files to scan.
 *
 * It used to hand-copy the whole ramp, which is how it ended up with a 12px card
 * radius against kit.css's 16 and a 44px control height against 46 — the same
 * component, three shapes, across the design source, the apps and the web.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: tailwindPreset.theme,
};

export default config;
`]);
}

let drift = 0;
for (const [path, content] of outputs) {
  const rel = relative(REPO, path);
  let current = null;
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    /* new file */
  }

  if (current === content) {
    if (!CHECK) console.log(`  unchanged  ${rel}`);
    continue;
  }

  if (CHECK) {
    drift++;
    console.error(`\n  DRIFT  ${rel}`);
    const a = (current ?? '').split('\n');
    const b = content.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error(`    line ${i + 1}`);
        console.error(`      on disk:   ${a[i] ?? '(missing)'}`);
        console.error(`      generated: ${b[i] ?? '(missing)'}`);
        break;
      }
    }
  } else {
    writeFileSync(path, content);
    console.log(`  wrote      ${rel}`);
  }
}

if (CHECK) {
  if (drift > 0) {
    console.error(
      `\ntokens: ${drift} generated file(s) have drifted from packages/tokens.\n` +
      'Run `npm run build:tokens` and commit the result. Do not hand-edit a generated file:\n' +
      'four hand-written copies of these values is what phase 6 exists to remove.\n',
    );
    process.exit(1);
  }
  console.log('tokens: generated files match packages/tokens');
} else {
  console.log('\ntokens: done');
}
