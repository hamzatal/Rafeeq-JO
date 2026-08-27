#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Generate the explicit Lucide icon registry.

   ── Why a generated registry and not a namespace import ────────────────────

   `lucide-react-native` exports ~1,777 individual components and no lookup map.
   `import * as Lucide from 'lucide-react-native'` then indexing it works — and
   Metro does not tree-shake a namespace import, so the entire library would ship
   in the app bundle to render the ~80 icons this product uses.

   Generating the list also turns a bad icon name into a COMPILE error. The old
   Feather wrapper typed its name as `keyof typeof Feather.glyphMap`, accepting
   ~280 names whether a screen used them or not, so a typo rendered nothing and
   read as a deliberate gap.

   ── Why generate against the INSTALLED package ─────────────────────────────

   Because Lucide renames glyphs. This script resolves every name against the
   `.d.ts` actually on disk and FAILS if one does not exist — which is how
   `home` → `house` and `help-circle` → `circle-question-mark` were caught. Both
   would have rendered nothing at runtime, silently.

   Usage:
     node scripts/build-icons.mjs           # write
     node scripts/build-icons.mjs --check   # verify, exit 1 on drift
   ═══════════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'packages/tokens/src/icon-registry.ts');
const CHECK = process.argv.includes('--check');

/** Feather / MaterialIcons kebab name → Lucide kebab name, where they differ. */
const MAP = {
  // Lucide renamed these three too. Each was found by generating against the
  // installed package rather than trusting the Feather name.
  filter: 'funnel',
  'more-vertical': 'ellipsis-vertical',
  unlock: 'lock-open',

  'account-balance-wallet': 'wallet',
  'airport-shuttle': 'bus',
  'arrow-forward': 'arrow-right',
  'alert-circle': 'circle-alert',
  'alert-triangle': 'triangle-alert',
  'bar-chart-2': 'chart-column',
  'check-circle': 'circle-check',
  'directions-car': 'car',
  'edit-2': 'pencil',
  grid: 'grid-3x3',
  'help-circle': 'circle-question-mark',
  home: 'house',
  'info-outline': 'info',
  loader: 'loader-circle',
  'local-taxi': 'car-taxi-front',
  'my-location': 'locate-fixed',
  notifications: 'bell',
  person: 'user',
  place: 'map-pin',
  'plus-circle': 'circle-plus',
  schedule: 'clock',
  school: 'graduation-cap',
  sliders: 'sliders-horizontal',
  stars: 'sparkles',
  'swap-vert': 'arrow-up-down',
  'upload-cloud': 'cloud-upload',
  'x-circle': 'circle-x',
};

/**
 * Names chosen at RUNTIME, which a static scan cannot see.
 *
 * e.g. `driver-app/app/(app)/earnings.tsx` picks between `arrow-up-right` and
 * `arrow-down-left` from the sign of a ledger amount. Missing one of these is a
 * type error at the call site rather than a blank icon, which is why they are
 * listed here rather than discovered in production.
 */
const EXTRA = [
  'book',
  'briefcase',
  'key',
  'package',
  'arrow-up-right', 'arrow-down-left', 'arrow-up-left', 'arrow-down-right',
  'chevron-up', 'chevron-down',
  'circle-alert', 'triangle-alert', 'circle-check', 'circle-x',
  'wifi-off', 'cloud-off', 'inbox', 'lock', 'unlock', 'eye', 'eye-off',
  'more-vertical', 'filter', 'calendar', 'percent', 'award', 'trending-up',
];

const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', 'build', '.next', 'android', 'ios']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }

  return out;
}

/** Every icon name referenced anywhere in the two Expo apps. */
function usedNames() {
  const found = new Set(EXTRA);
  const patterns = [
    /<Icon\s+[^>]*name="([a-z0-9-]+)"/g,
    /icon:\s*'([a-z0-9-]+)'/g,
    /\bicon="([a-z0-9-]+)"/g,
    /tab\('([a-z0-9-]+)'\)/g,
    /name=\{?['"]([a-z0-9-]+)['"]\}?\s*(?:size|color|\/>)/g,
    /<MaterialIcons\s+name="([a-z0-9_-]+)"/g,
    /(?:icon|glyph)\s*[:=]\s*'([a-z0-9-]+)'/g,
  ];

  for (const app of ['student-app', 'driver-app']) {
    for (const file of walk(resolve(ROOT, app))) {
      const body = readFileSync(file, 'utf8');
      for (const re of patterns) {
        for (const m of body.matchAll(re)) found.add(m[1]);
      }
    }
  }

  return [...found].filter((n) => n && !/^\d+$/.test(n)).sort();
}

const pascal = (kebab) => kebab.split(/[-_]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');

/** Every component the given Lucide package actually exports, read off its `.d.ts`. */
function exportsOf(relDts) {
  const decl = readFileSync(resolve(ROOT, relDts), 'utf8');
  const names = new Set([...decl.matchAll(/declare const (\w+):/g)].map((m) => m[1]));
  if (names.size === 0) throw new Error(`build-icons: no components found in ${relDts}`);

  return names;
}

const available = exportsOf('node_modules/lucide-react-native/dist/types/icons.d.ts');

/* ───────────────────────────────────────────────────────────────────────────
   STAGE 1 — the admin dashboard.

   The dashboard cannot use the generated registry: it renders DOM SVG from
   `lucide-react`, a different package with a different export list, and its names
   arrive as strings — `icon: 'sports_motorsports'` in a nav table, `{k.icon}` in a
   KPI card. TypeScript sees `string`, so a name that Lucide does not export is not
   a compile error there; it renders the fallback question mark at runtime.

   That is the same silent-failure shape as the Material Symbols webfont this
   replaced, where an unsubset ligature rendered as the literal text `person_add`.
   So the names are checked HERE, statically, against the installed package.
   ─────────────────────────────────────────────────────────────────────────── */

/** Pull a `Record<string, string>` literal out of the tokens source. */
function tsMap(source, constName) {
  const start = source.indexOf(`export const ${constName}`);
  if (start === -1) throw new Error(`build-icons: ${constName} not found in icon.ts`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('\n};', open);
  const body = source.slice(open, close);
  const out = {};
  for (const m of body.matchAll(/^ {2}'?([a-z0-9_-]+)'?:\s*'([a-z0-9-]+)',$/gm)) out[m[1]] = m[2];

  return out;
}

function checkAdminNames() {
  const iconTs = readFileSync(resolve(ROOT, 'packages/tokens/src/icon.ts'), 'utf8');
  const renamed = tsMap(iconTs, 'RENAMED');
  const web = exportsOf('node_modules/lucide-react/dist/lucide-react.d.ts');

  /*
   * Three shapes, because an icon name reaches `<Icon>` three ways — and the third
   * one is what a narrower version of this scan MISSED.
   *
   * `insights/page.tsx` passes names to a LOCAL `Stat` component as `icon="task_alt"`,
   * which forwards to `<Icon name>`. A scan for `<Icon name="…">` and `icon: '…'` only
   * reported "0 legacy ligatures" while ten Material names were live on that page,
   * every one of them rendering the fallback question mark in the KPI grid. Matching
   * the ATTRIBUTE rather than the component is what catches a wrapper.
   */
  const used = new Map(); // name → first file that uses it
  for (const file of walk(resolve(ROOT, 'admin-dashboard'))) {
    if (file.endsWith('components/Icon.tsx')) continue; // its doc comment names the old system
    const body = readFileSync(file, 'utf8');
    const rel = file.slice(resolve(ROOT).length + 1);
    const patterns = [
      /<Icon\s+[^>]*name="([a-z0-9_-]+)"/g, // <Icon name="x" />
      /\bicon:\s*'([a-z0-9_-]+)'/g, //         { icon: 'x' } in a nav table
      /\bicon="([a-z0-9_-]+)"/g, //            <Stat icon="x" /> — any wrapper
    ];
    for (const re of patterns) {
      for (const m of body.matchAll(re)) if (!used.has(m[1])) used.set(m[1], rel);
    }
  }

  const bad = [];
  for (const [name, file] of used) {
    const lucide = renamed[name] ?? name;
    if (!web.has(pascal(lucide))) bad.push([name, lucide, file]);
  }

  if (bad.length > 0) {
    console.error('\nicons: the dashboard uses names the installed lucide-react does not export:\n');
    for (const [name, lucide, file] of bad) {
      console.error(`  ${name}  →  ${lucide}  →  ${pascal(lucide)}   NOT FOUND   ${file}`);
    }
    console.error(
      '\nSearch node_modules/lucide-react/dist/lucide-react.d.ts for the current name\n' +
      'and fix the call site. Unresolved, this renders the fallback question mark.\n',
    );
    process.exit(1);
  }

  /*
   * The dashboard's vocabulary must be Lucide's, not Material's. A snake_case name
   * means a Material ligature came back — either a new call site copied an old one, or
   * a merge resurrected a file. It cannot resolve, so it would fail above too; naming
   * it separately says WHY.
   */
  const ligatures = [...used].filter(([n]) => n.includes('_'));
  if (ligatures.length > 0) {
    console.error('\nicons: Material Symbols ligature names are back in the dashboard:\n');
    for (const [name, file] of ligatures) console.error(`  ${name}   ${file}`);
    process.exit(1);
  }

  console.log(`icons: dashboard ok — ${used.size} Lucide names, 0 legacy ligatures`);
}

checkAdminNames();

const rows = [];
const missing = [];
for (const name of usedNames()) {
  const component = pascal(MAP[name] ?? name);
  if (available.has(component)) rows.push([name, component]);
  else missing.push([name, MAP[name] ?? name, component]);
}

if (missing.length > 0) {
  console.error('\nbuild-icons: these names do not exist in the installed Lucide:\n');
  for (const [name, lucide, component] of missing) {
    console.error(`  ${name}  →  ${lucide}  →  ${component}   NOT FOUND`);
  }
  console.error(
    '\nLucide renames glyphs between versions, and an unmapped name renders NOTHING —\n' +
    'a gap the right size, so the layout still looks deliberate. Add a mapping to MAP\n' +
    'in this script. Search the installed .d.ts for the new name.\n',
  );
  process.exit(1);
}

/*
 * Several kebab names legitimately resolve to ONE component — `arrow-forward` and
 * `arrow-right` are both ArrowRight, `notifications` and `bell` are both Bell. The
 * import list must be deduped while the registry keeps every key, or TypeScript
 * reports a duplicate identifier.
 */
const components = [...new Set(rows.map(([, c]) => c))].sort();

const body = `/* ╔════════════════════════════════════════════════════════════════════════╗
   ║  GENERATED — \`cd frontend && npm run build:icons\`. Do not edit.         ║
   ╚════════════════════════════════════════════════════════════════════════╝ */

/*
 * An EXPLICIT registry, not a namespace import.
 *
 * \`lucide-react-native\` exports ~${available.size} individual components and no lookup
 * map. \`import * as Lucide\` then indexing it works, but Metro does not tree-shake a
 * namespace import — so the whole library would ship in the app bundle to render the
 * ${rows.length} icons this product actually uses.
 *
 * Generating the list also makes a bad name a COMPILE error instead of a blank space.
 * The old Feather wrapper typed its name as \`keyof typeof Feather.glyphMap\`, which
 * accepted ~280 names whether a screen used them or not; a typo rendered nothing and
 * read as a deliberate gap. Generating against the INSTALLED package is what caught
 * \`home\` → \`house\` and \`help-circle\` → \`circle-question-mark\`, two renames that
 * would each have silently erased an icon.
 *
 * Note several keys share a component on purpose: \`arrow-forward\` and \`arrow-right\`
 * are both ArrowRight, \`notifications\` and \`bell\` are both Bell. The legacy names are
 * kept so ~120 call sites did not have to change in the same commit as the icon set.
 */
import {
${components.map((c) => `  ${c},`).join('\n')}
} from 'lucide-react-native';

export const ICON_REGISTRY = {
${rows.map(([k, c]) => `  '${k}': ${c},`).join('\n')}
} as const;

/** Every icon name this product may use. A typo is a type error. */
export type IconName = keyof typeof ICON_REGISTRY;
`;

let current = null;
try {
  current = readFileSync(OUT, 'utf8');
} catch {
  /* first run */
}

if (current === body) {
  console.log(`icons: registry matches (${rows.length} icons, ${components.length} components)`);
  process.exit(0);
}

if (CHECK) {
  console.error(
    '\nicons: the generated registry has drifted.\n' +
    'Run `npm run build:icons` and commit the result.\n',
  );
  process.exit(1);
}

writeFileSync(OUT, body);
console.log(`icons: wrote ${rows.length} names over ${components.length} components`);
