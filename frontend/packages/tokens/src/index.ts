/* ═══════════════════════════════════════════════════════════════════════════
   @rafeeq/tokens — the single source of every design value.

   ── What this replaced ─────────────────────────────────────────────────────

   Four independent sources that had already drifted:

     1. `docs/design/src/kit.css`            — the canonical brand, hand-written
     2. `docs/design/src/ui.mjs`             — the same hexes copied as literals
     3. `packages/shared/src/theme/**`       — a hand copy, PLUS a whole retired
                                               navy/teal palette still rendering
                                               on both apps' splash screens
     4. `admin-dashboard/tailwind.config.ts` — a third hand copy, with radii and
                                               control heights that disagreed
                                               with the other three

   None of the drift was caught by review, because nothing compared the files.
   Now (1) and (4) are GENERATED from here by `npm run build:tokens`, and (3) is
   deleted. `check:tokens` regenerates in CI and fails on drift, so a hand edit to
   kit.css is caught instead of quietly becoming a fifth truth.

   ── One entry point, and exactly one exception ─────────────────────────────

   This was briefly split into `@rafeeq/tokens/rn` and `/tailwind` subpath
   exports, which do not resolve: `expo/tsconfig.base` uses classic Node module
   resolution, and classic resolution ignores the `exports` map entirely. Every
   export below is a plain constant object with no platform imports, so one barrel
   is both simpler and correct.

   `icon-registry.ts` is the exception and is NOT re-exported here. It holds
   `lucide-react-native` COMPONENTS, not values, so re-exporting it dragged
   `react-native` into the Next.js bundle through this barrel and broke
   `next build` with a Flow syntax error inside `react-native/index.js` — the
   dashboard imported `formatJod`-adjacent constants and got the whole mobile
   renderer. The two Expo apps deep-import it instead:

     import { ICON_REGISTRY, type IconName } from '@rafeeq/tokens/src/icon-registry';

   The `src/` in that path is deliberate: it is a real file path, so it resolves
   under classic Node resolution AND under an `exports`-aware bundler (the map in
   package.json lists it). A bare `@rafeeq/tokens/icon-registry` would depend on
   the resolver honouring `exports`, which Metro does not guarantee.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── raw ramp ─────────────────────────────────────────────────────────────── */
export { alpha, brand, live, neutral, RETIRED, status } from './color';

/* ── type ─────────────────────────────────────────────────────────────────── */
export { fontFamily, fontStack, fontStackList, fontWeight, legacyText, rnType, type } from './type';
export type { TypeRole } from './type';

/* ── space, elevation, stacking ───────────────────────────────────────────── */
export { boxShadow, layer, radius, shadow, size, space } from './space';

/* ── semantic roles ───────────────────────────────────────────────────────── */
export { colors, legacyAliases } from './semantic';
export type { Colors } from './semantic';

/* ── the React Native theme object ────────────────────────────────────────── */
export { rnTheme, staticColors, useTheme } from './rn';
export type { AppTheme, RnColors } from './rn';

/* ── icons ────────────────────────────────────────────────────────────────── */
export {
  ICON_SIZE, ICON_STROKE, lucideName, RENAMED, RTL_MIRRORED, shouldMirror,
} from './icon';
/* `ICON_REGISTRY` / `IconName` live at `@rafeeq/tokens/src/icon-registry` — see above. */

/* ── numbers in an RTL paragraph ──────────────────────────────────────────── */
export { count, isolate, percent, range, tabularNums } from './num';

/* ── the Tailwind preset ──────────────────────────────────────────────────── */
export { tailwindPreset } from './tailwind';
