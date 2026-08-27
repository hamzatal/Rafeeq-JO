/* ═══════════════════════════════════════════════════════════════════════════
   SPACE — spacing, radii, control geometry, elevation.
   ═══════════════════════════════════════════════════════════════════════════ */

import { alpha, brand } from './color';

/**
 * Spacing scale, 4px based.
 *
 * `none` and `4xl` from the old scale are gone: both had zero usages across both
 * apps, and a scale step nobody reaches for is a step that invites inconsistency
 * rather than preventing it.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
} as const;

/**
 * Corner radii — and only three real ones, which is the point.
 *
 * kit.css declares exactly `--r-ctl: 12`, `--r-card: 16`, `--r-sheet: 24`, and
 * that restraint is what makes a screen look designed rather than assembled. The
 * old scale had seven steps (`sm 8, md 12, lg 16, xl 24, 2xl 28 …`) and the apps
 * used five of them, so a card and a modal could disagree by 4px for no reason.
 *
 * ── One reconciliation ─────────────────────────────────────────────────────
 *
 * The admin dashboard disagreed with both: `.card` used Tailwind `rounded-xl`
 * (12px) where kit.css says 16, and `.input` used `rounded-lg` (8px) where
 * kit.css says 12. So the same component was three different shapes across the
 * design source, the apps and the web. Unified on kit.css, because those values
 * are the ones that went through the density review.
 */
export const radius = {
  control: 12,
  card: 16,
  sheet: 24,
  pill: 9999,
} as const;

/**
 * Control geometry, from kit.css's density tokens.
 *
 * `control: 46` reconciles another three-way disagreement — the admin's `.btn`
 * and `.input` were `h-11` (44px) while kit.css specifies 46. Two pixels sounds
 * like nothing until a button sits beside an input from the other system.
 */
export const size = {
  control: 46,
  tabBar: 64,
  gutter: 16,
  cardPad: 14,
  rowPad: 12,
  hairline: 1,
} as const;

/**
 * Elevation, tinted with the brand's deepest tone.
 *
 * ── The bug this fixes ─────────────────────────────────────────────────────
 *
 * Every React Native shadow in both apps was `shadowColor: '#002045'` — the navy
 * from the identity phase 4 deleted. So every card in the product cast a shadow
 * from a brand that no longer exists. Nobody noticed because a shadow at 5%
 * opacity reads as "grey" regardless of hue, which is exactly why it survived
 * three audits.
 *
 * The tint is now `brand.900`, matching kit.css's `rgba(18,47,107,…)`. At these
 * opacities the change is invisible — which is the point: it is a correctness
 * fix, not a redesign.
 *
 * GEOMETRY is deliberately unchanged from what shipped. kit.css's web shadows
 * use blur 12/32; the RN scale uses 12/24/30 with offsets 4/10/16. Those were
 * tuned on device during the density pass, and matching a CSS blur radius to a
 * native one is not a value-for-value operation anyway.
 */
const SHADOW_TINT = brand[900];

export const shadow = {
  sm: {
    shadowColor: SHADOW_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  md: {
    shadowColor: SHADOW_TINT,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  lg: {
    shadowColor: SHADOW_TINT,
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
} as const;

/** The same elevation as CSS, for the web. Verbatim kit.css `--sh-md`/`--sh-lg`. */
export const boxShadow = {
  card: `0 4px 12px ${alpha(SHADOW_TINT, 0.08)}, 0 1px 3px ${alpha(SHADOW_TINT, 0.06)}`,
  lift: `0 12px 32px ${alpha(SHADOW_TINT, 0.12)}, 0 4px 8px ${alpha(SHADOW_TINT, 0.06)}`,
} as const;

/**
 * Stacking order, named.
 *
 * Nothing declared these anywhere — the doc generators used raw `z-index: 60`,
 * `65`, `70` and the apps relied on source order. Named layers are how you avoid
 * discovering at 2am that a bottom sheet renders behind a map pin.
 */
export const layer = {
  base: 0,
  raised: 10,
  sticky: 20,
  overlay: 60,
  sheet: 65,
  toast: 70,
} as const;
