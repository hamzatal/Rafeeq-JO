/* ═══════════════════════════════════════════════════════════════════════════
   ICONS — one naming system, mirrored where direction matters.

   ── Three disjoint systems before this ─────────────────────────────────────

     • the two Expo apps used Feather, kebab-case      `chevron-left`
     • the admin dashboard used Material Symbols       `chevron_left` ligatures
     • `docs/design/src/ui.mjs` — the MOCKUP renderer — already used a 48-name
       LUCIDE path map                                 `chevron-left`

   So the design source drew Lucide icons and the product rendered Feather ones.
   Every mockup disagreed with the screen it depicted, on every icon, and the
   dashboard disagreed with both. Nobody could tell, because a chevron is a chevron
   until you compare stroke weights and corner radii side by side.

   Lucide is the target because the design source is already Lucide. It is also a
   superset of Feather — Lucide began as a Feather fork — so most names carry over
   unchanged, and the ones that do not are listed in `RENAMED` below.

   ── What lives here and what does not ──────────────────────────────────────

   This file holds the NAMING and the MIRROR SET, because those are design
   decisions shared by all three clients. The components differ by platform
   (`lucide-react-native` renders SVG, `lucide-react` renders DOM) so each app has
   a thin `Icon` over this. Phase 7 folds them into `packages/ui`.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Icons that must be horizontally mirrored under RTL.
 *
 * Lucide, like Feather, does not auto-flip: a "back" chevron points left in both
 * directions unless told otherwise, so in Arabic it points forward. Only
 * DIRECTIONAL glyphs are mirrored — flipping a symmetric icon is a no-op, and
 * flipping something like a magnifier looks broken.
 *
 * Carried across from the Expo apps' `Icon.tsx`, which had this right. The admin
 * dashboard had NO mirroring at all, so every chevron in its RTL tables pointed
 * the wrong way — a bug that shipped because the reviewer reads Arabic and simply
 * stopped noticing.
 */
export const RTL_MIRRORED = new Set<string>([
  'chevron-left', 'chevron-right', 'chevrons-left', 'chevrons-right',
  'arrow-left', 'arrow-right',
  'arrow-up-left', 'arrow-up-right', 'arrow-down-left', 'arrow-down-right',
  'corner-up-left', 'corner-up-right', 'corner-down-left', 'corner-down-right',
  'corner-left-up', 'corner-right-up', 'corner-left-down', 'corner-right-down',
  'log-in', 'log-out', 'send', 'reply', 'undo-2', 'redo-2',
  'trending-up', 'trending-down',
]);



/*
 * There is no NAME MAP AT ALL any more, on purpose.
 *
 * Two used to exist. `MATERIAL_TO_LUCIDE` translated the dashboard's snake_case
 * ligatures; phase 6 deleted it by rewriting those call sites. `RENAMED` translated
 * the Expo apps' Feather-era kebab names — `alert-circle`, `check-circle`, `home`,
 * `upload-cloud` — and phase 7 deleted it the same way: 17 call sites across 17
 * files now use the canonical Lucide name.
 *
 * The remaining note is about the Material map, and applies equally to both.
 *
 * An intermediate version of this file carried a 62-entry `MATERIAL_TO_LUCIDE`
 * translating the dashboard's snake_case ligatures (`person_add`, `sports_motorsports`)
 * so its ~45 call sites could stay untouched. It is gone: the call sites were rewritten
 * to Lucide names instead. A compatibility map would have left TWO icon vocabularies
 * live in one codebase — the exact confusion this phase exists to remove — and every
 * new call site would have had to pick one.
 *
 * Two of those 62 were judgement calls rather than translations, recorded here because
 * the call sites no longer show the original intent:
 *
 *   • `sports_motorsports` was a RACING HELMET on the captains section. Lucide has no
 *     helmet, and `hard-hat` reads as construction work — wrong signal for a driver in
 *     Amman. It is `car-front`, which is what the mockups already draw for a captain.
 *   • `history` on the audit log is `rotate-ccw-clock`. Lucide dropped the `history`
 *     name outright; `icons.History` is `undefined` in the installed version.
 *
 * `scripts/build-icons.mjs` resolves every dashboard name against the installed
 * `lucide-react` on each run and fails the build on one it does not export. That check
 * is what makes the direct names safe: the dashboard's names are plain strings in nav
 * tables, so TypeScript cannot catch a typo the way it does in the Expo apps.
 */

/**
 * The Lucide name for an icon.
 *
 * The IDENTITY now, and kept as a function rather than deleted for two reasons: the
 * three `Icon` components call it, and Lucide will rename a glyph again. When it
 * does, this is the one place the mapping goes — and `check:icons` will have failed
 * the build before anyone has to look for it.
 */
export function lucideName(name: string): string {
  return name;
}

/** Should this icon be flipped in an RTL layout? */
export function shouldMirror(name: string): boolean {
  return RTL_MIRRORED.has(lucideName(name));
}

/**
 * Default stroke width.
 *
 * `ui.mjs` draws its Lucide paths at 1.75, and Lucide's own default is 2. The
 * mockups are the approved reference, so 1.75 it is — a hair lighter, which also
 * sits better next to Arabic text at small sizes.
 */
export const ICON_STROKE = 1.75;

/** Default size, matching the old Feather wrapper so nothing resizes. */
export const ICON_SIZE = 22;
