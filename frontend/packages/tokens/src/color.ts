/* ═══════════════════════════════════════════════════════════════════════════
   COLOUR — the one ramp.

   Every colour in the product comes from here. There is no second palette, no
   per-app palette, and no dark scheme (decision 7).

   ── Why this file is the source and kit.css is generated ───────────────────

   The roadmap said "packages/tokens FROM kit.css". Built that way round it does
   not actually remove the hand copies, for two reasons:

     1. kit.css declares no spacing scale, no type scale as custom properties,
        no z-index and no durations — they are baked into class rules. A
        generator reading it could only produce a third of a token set, so the
        rest would still be hand-written somewhere.
     2. Three of the four consumers are TypeScript (two Expo apps + the Tailwind
        preset). Parsing CSS to produce types means the types are only as good
        as the parser, and a typo in a custom property becomes `undefined` at
        runtime rather than a compile error.

   So the direction is inverted: this TS is the source, and `npm run
   build:tokens` emits kit.css and the Tailwind preset from it. That removes the
   hand copy from ALL FOUR places instead of three, and `check:tokens` re-runs
   the generator in CI and fails if any output has drifted.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Brand ramp. `600` is the brand blue; everything else is derived tone. */
export const brand = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#8EC1FD',
  400: '#5AA2FB',
  500: '#2E82F6',
  600: '#1259E3',
  700: '#0E47B4',
  800: '#0F3A8C',
  900: '#122F6B',
} as const;

/**
 * Neutrals. `n0` is white and `n900` is the ink used for body text.
 *
 * Not grey-blue by accident: the ramp is very slightly cooled toward the brand
 * so a neutral surface next to a brand surface does not read as dirty.
 */
export const neutral = {
  0: '#FFFFFF',
  25: '#F9FAFB',
  50: '#F2F5F9',
  100: '#E9EDF4',
  200: '#DDE3EC',
  300: '#C6CEDA',
  400: '#96A0B2',
  500: '#67728A',
  600: '#4E5872',
  700: '#39415A',
  800: '#232939',
  900: '#0E1524',
} as const;

/**
 * Amber — the ONLY second colour in the system (decision 13).
 *
 * It means exactly two things and nothing else: a destination, and a live
 * state. It is never used for emphasis, never for a call to action, and never
 * decoratively. That restraint is what makes it readable as a signal.
 */
export const live = {
  base: '#F59E0B',
  soft: '#FEF3C7',
} as const;

/**
 * Status colours. Each has a `soft` tint for a filled background behind text.
 *
 * Note `info` is the brand blue at high depth, not a fourth hue. "Informational"
 * is the brand speaking quietly, and adding a cyan for it is how palettes grow
 * to nine colours nobody can name.
 */
export const status = {
  success: '#047857',
  successSoft: '#ECFDF5',
  danger: '#D92D20',
  dangerSoft: '#FEF3F2',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
} as const;

/** `rgba()` from a hex, for the handful of tints that must be translucent. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * The RETIRED identity, kept ONLY so a gate can recognise it.
 *
 * Phase 4 deleted the navy/teal brand, and it survived in three places nobody
 * looked at: `palette` in the old `shared/src/theme/colors.ts` (which the SPLASH
 * SCREEN of both apps still rendered), the `shadowColor` on every React Native
 * shadow, and four scrollbar rules in the admin's `globals.css`. So both apps
 * opened on the dead brand and every card cast a navy shadow.
 *
 * Listing the corpses here lets `check:tokens` fail on them by value instead of
 * relying on somebody remembering. Never import these to USE them.
 */
export const RETIRED = {
  navy: '#002045',
  navyContainer: '#1A365D',
  navyDeep: '#001B3C',
  teal: '#006A65',
  tealBright: '#4EDBD2',
  oldBackground: '#F9F9FF',
  oldText: '#111C2C',
  oldTextSecondary: '#43474E',
  oldBorder: '#C4C6CF',
  oldHairline: '#E7EEFF',
  oldMuted: '#74777F',
  oldWarning: '#F79009',
  oldDanger: '#BA1A1A',
} as const;
