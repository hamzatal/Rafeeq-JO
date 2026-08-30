/* ═══════════════════════════════════════════════════════════════════════════
   The translation dictionary, and every place the apps reach into it.

   ── Why this module exists ─────────────────────────────────────────────────

   Phase 8.9 deleted 188 "dead" translation keys. 42 of them were alive, and the
   apps shipped for one commit rendering the KEY to the user:

     • `payments.receiptHeading` was the title printed on the PDF receipt
     • `common.crashTitle` was the heading on the crash screen
     • `onboarding.s1Title` was the first line a new student ever read
     • `driver.statusPending` was the badge on an unapproved captain's dashboard

   All 42 were reached the same way — **not** as `t('some.key')`, but as a string
   in a lookup table:

       const statusMeta = { pending: { key: 'driver.statusPending', … } };
       …
       t(meta.key)

   A scan for `t('…')` cannot see that, so the detector called them dead. And
   because `t()` falls back to RETURNING THE KEY on a miss (see `i18n/index.ts`),
   nothing failed: not the typechecker, not a test, not the app. The bug was
   invisible to every gate we had and fully visible to every user.

   ── The fix is one collector, used in both directions ──────────────────────

   The two questions are inverses of each other:

     • is any key in the dictionary UNREFERENCED?   (dead weight → delete it)
     • is any REFERENCED key absent from the dictionary?  (a lie → restore it)

   They were answered by two different pieces of code, so they could — and did —
   disagree. Here they share `dictionaryKeys()` and `referencedKeys()`, so a key
   is dead if and only if it is not referenced. Making them literally the same
   function is what stops the two answers drifting apart again.

   ── What a "reference" is ──────────────────────────────────────────────────

   Any string literal shaped like a dotted path whose first segment is a real
   top-level namespace. That deliberately over-collects: `'trips.title'` counts as
   a reference even in a comment or a variable name. Over-collecting is the safe
   direction — it can leave a genuinely dead key in the dictionary (harmless), but
   it can never delete a live one (a user-visible lie).
   ═══════════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The dictionary the two Expo apps share. `admin-dashboard` has its own. */
const DICTIONARY = resolve(FRONTEND, 'packages/shared/src/i18n/ar.ts');

/**
 * Trees that read the shared dictionary.
 *
 * `admin-dashboard` is absent on purpose: it ships its own dictionary in
 * `src/lib/i18n.ts`, so its `'home.subtitle'` is a different key that happens to
 * have the same shape. Including it produced 40 phantom "missing" keys.
 */
export const CONSUMERS = ['student-app', 'driver-app', 'packages/ui', 'packages/shared'];

/**
 * Namespaces addressed by a COMPUTED suffix, e.g. `` t(`push.${type}`) `` or
 * `t('emergency.relation.' + value)`.
 *
 * A key under one of these cannot be proven referenced by reading source, so the
 * dead-key direction treats the whole namespace as live. Kept deliberately short:
 * every entry here is a namespace whose dead keys we can no longer detect, which
 * is a real cost — it is paid only where the alternative is deleting a live key.
 */
export const DYNAMIC_NAMESPACES = new Set(['push', 'a11y']);

/**
 * Key PREFIXES completed at runtime, e.g.:
 *
 *     t(`home.${greetingKey()}`)            // → home.goodMorning | …Afternoon | …Evening
 *     t(`home.label${cap(a.label)}`)        // → home.labelHome | …Work | …Other
 *
 * A string prefix, not a path prefix: the computed part is the tail of the key
 * NAME, not a further segment, so `home.good` has to match `home.goodMorning`.
 * Narrower than naming the whole namespace — `home`'s other 40 keys stay
 * checkable, which is the point.
 */
export const DYNAMIC_PREFIXES = new Set(['emergency.relation', 'home.good', 'home.label']);

/**
 * Final segments that mean "this is a filename, not a translation key".
 *
 * `'payments.tsx'` in a router path and `'permissions.ts'` in a barrel comment
 * both parse as `namespace.key` because `payments` and `permissions` are real
 * namespaces. Without this the gate reported two phantom missing keys.
 */
const FILE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'md', 'css', 'png', 'jpg', 'svg', 'ttf', 'pdf', 'html', 'yml', 'yaml',
]);

const SKIP_DIRS = new Set(['node_modules', '.expo', '.next', 'dist', 'build', 'android', 'ios']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }

  return out;
}

/**
 * Every leaf path in the dictionary, plus every namespace it is nested under.
 *
 * Brace-tracked rather than indentation-matched: the previous parser keyed on a
 * four-space indent and therefore could not see keys nested two levels deep,
 * which is exactly where the dynamically-addressed ones live.
 *
 * @returns {{ leaves: Set<string>, namespaces: Set<string>, containers: Set<string> }}
 */
export function dictionaryKeys(source = readFileSync(DICTIONARY, 'utf8')) {
  const leaves = new Set();
  const namespaces = new Set();
  const containers = new Set();
  /** @type {string[]} */
  const path = [];

  for (const raw of source.split('\n')) {
    const line = raw.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '').trim();
    if (line === '') continue;

    const open = line.match(/^([a-zA-Z0-9_]+)\s*:\s*\{$/);
    if (open) {
      path.push(open[1]);
      const dotted = path.join('.');
      containers.add(dotted);
      if (path.length === 1) namespaces.add(dotted);
      continue;
    }

    const leaf = line.match(/^([a-zA-Z0-9_]+)\s*:\s*['"`]/);
    if (leaf && path.length > 0) {
      leaves.add([...path, leaf[1]].join('.'));
      continue;
    }

    if (/^\},?$/.test(line)) path.pop();
  }

  return { leaves, namespaces, containers };
}

/**
 * Every dotted path the consuming code mentions, mapped to where it was seen.
 *
 * @param {Set<string>} namespaces top-level namespaces, from `dictionaryKeys()`
 * @returns {Map<string, string[]>} key → `file:line` sites, repo-relative
 */
export function referencedKeys(namespaces) {
  /** @type {Map<string, string[]>} */
  const refs = new Map();

  for (const tree of CONSUMERS) {
    for (const file of walk(resolve(FRONTEND, tree))) {
      // The dictionary defines keys; it does not reference them.
      if (file.includes(`${join('src', 'i18n')}${'/'}`) || file.includes('/src/i18n/')) continue;

      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/['"`]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)['"`]/g)) {
        const key = m[1];
        const segments = key.split('.');
        if (!namespaces.has(segments[0])) continue;
        if (FILE_EXTENSIONS.has(segments[segments.length - 1])) continue;
        const site = `${relative(FRONTEND, file)}:${src.slice(0, m.index).split('\n').length}`;
        const seen = refs.get(key);
        if (seen) seen.push(site);
        else refs.set(key, [site]);
      }
    }
  }

  return refs;
}

/** True when `key` is addressed by a computed namespace or a computed suffix. */
export function isDynamic(key) {
  if (DYNAMIC_NAMESPACES.has(key.split('.')[0])) return true;
  for (const prefix of DYNAMIC_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Keys the apps ask for and the dictionary does not have.
 *
 * `t()` returns the key itself on a miss, so each of these is a screen showing
 * `driver.statusPending` to a user.
 *
 * @returns {Array<{ key: string, sites: string[] }>}
 */
export function missingKeys() {
  const { leaves, namespaces, containers } = dictionaryKeys();
  const found = [];

  for (const [key, sites] of referencedKeys(namespaces)) {
    if (leaves.has(key) || containers.has(key) || isDynamic(key)) continue;
    found.push({ key, sites });
  }

  return found.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Keys the dictionary carries that nothing asks for.
 *
 * @returns {string[]}
 */
export function unreadKeys() {
  const { leaves, namespaces } = dictionaryKeys();
  const refs = referencedKeys(namespaces);

  return [...leaves].filter((key) => !refs.has(key) && !isDynamic(key)).sort();
}
