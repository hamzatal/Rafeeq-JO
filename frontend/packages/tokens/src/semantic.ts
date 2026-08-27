/* ═══════════════════════════════════════════════════════════════════════════
   SEMANTIC — what each colour is FOR.

   `color.ts` holds the ramp. This maps the ramp onto roles, so a screen asks for
   `colors.textSecondary` and never for `neutral[600]`. When the ramp shifts, the
   roles follow and no screen changes.
   ═══════════════════════════════════════════════════════════════════════════ */

import { alpha, brand, live, neutral, status } from './color';

export interface Colors {
  /* Brand */
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryMuted: string;

  /**
   * `accent` is the SAME hue as primary, deliberately.
   *
   * There is one interactive colour. A distinct accent is precisely how the two
   * apps drifted apart before — one used it for primary actions, the other for
   * highlights, and the same button ended up two colours. Kept as a separate key
   * so the intent at each call site stays readable.
   */
  accent: string;
  accentSoft: string;
  accentBright: string;
  onAccent: string;

  /* Surfaces, from flattest to most raised */
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceHigh: string;
  surfaceHighest: string;

  /* Text */
  text: string;
  textSecondary: string;
  muted: string;
  textInverse: string;

  /* Lines */
  border: string;
  hairline: string;

  /* Status */
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  /* Scrims */
  overlay: string;
  scrim: string;

  /** Destination and live state. The only second colour. */
  live: string;
  liveSoft: string;
}

export const colors: Colors = {
  primary: brand[600],
  primaryDark: brand[700],
  primarySoft: alpha(brand[600], 0.08),
  primaryContainer: brand[800],
  onPrimary: neutral[0],
  onPrimaryMuted: brand[200],

  accent: brand[600],
  accentSoft: alpha(brand[600], 0.1),
  accentBright: brand[200],
  onAccent: neutral[0],

  background: neutral[50],
  surface: neutral[0],
  surfaceAlt: brand[50],
  surfaceHigh: brand[100],
  surfaceHighest: brand[200],

  text: neutral[900],
  textSecondary: neutral[600],
  muted: neutral[500],
  textInverse: neutral[0],

  border: neutral[300],
  hairline: neutral[200],

  success: status.success,
  successSoft: status.successSoft,
  warning: status.warning,
  warningSoft: status.warningSoft,
  danger: status.danger,
  dangerSoft: status.dangerSoft,
  // Informational is the brand at depth, not a fourth hue.
  info: brand[700],
  infoSoft: brand[50],

  overlay: alpha(neutral[900], 0.42),
  scrim: alpha(neutral[900], 0.62),

  live: live.base,
  liveSoft: live.soft,
};

/**
 * Aliases the old `ThemeColors` had that nothing should reach for any more.
 *
 * `card` and `elevated` were both plain white and identical to `surface`, so
 * three keys described one colour and a reader could not tell which was
 * intended. Kept as aliases through the migration so the diff stays reviewable,
 * and flagged by `check:tokens` so they do not become permanent.
 *
 * @deprecated use `surface`
 */
export const legacyAliases = {
  card: colors.surface,
  elevated: colors.surface,
  transparent: 'transparent',
} as const;
