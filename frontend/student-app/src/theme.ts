/* ═══════════════════════════════════════════════════════════════════════════
   The app's theme — now a re-export of @rafeeq/tokens.

   ── What this file used to be ──────────────────────────────────────────────

   A hand-assembled object built from `@rafeeq/shared`'s `theme/**`, which was
   itself a hand copy of `docs/design/src/kit.css`. Four copies of the same values
   existed and had drifted: shadows were tinted with a navy from an identity
   deleted two phases earlier, and `driver-app/src/theme.ts` was byte-identical to
   this file except for a `buildTheme('driver')` argument that the function
   ignored — so the two apps looked the same by luck rather than by construction.

   Now there is one source (`packages/tokens`), and this file exists only so the
   ~450 existing `t.spacing.md` / `t.colors.text` call sites keep resolving. It is
   deliberately a re-export and not a wrapper: a wrapper is where a fifth copy
   would start.
   ═══════════════════════════════════════════════════════════════════════════ */

export { rnTheme as theme, staticColors, useTheme } from '@rafeeq/tokens';
export type { AppTheme } from '@rafeeq/tokens';
