export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  /** brand-600 — primary buttons, headers, active anchors. Carries white text. */
  primary: string;
  primaryDark: string;
  primarySoft: string;
  /**
   * Interactive accent. Deliberately the SAME blue as `primary`, not a second hue.
   * See the note on `LIVE` below for the one exception in the whole system.
   */
  accent: string;
  accentSoft: string;
  onPrimary: string;
  onAccent: string;
  /** brand-200 — highlight text and icons on a brand-coloured surface. */
  accentBright: string;
  /** brand-800 — layered brand chrome, gradients. */
  primaryContainer: string;
  /** brand-200 — muted text/icon ON a brand surface. */
  onPrimaryMuted: string;
  background: string;
  surface: string;
  card: string;
  elevated: string;
  /** Quiet tinted container — inputs, subdued tiles. */
  surfaceAlt: string;
  /** Slightly stronger tint — quick-action circles, tiles. */
  surfaceHigh: string;
  /** Strongest tint — pressed and selected states. */
  surfaceHighest: string;
  text: string;
  textSecondary: string;
  muted: string;
  textInverse: string;
  border: string;
  hairline: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  infoSoft: string;
  overlay: string;
  scrim: string;
  /**
   * The live/tracking amber. The ONE sanctioned second colour in the identity
   * (roadmap decision 13), and it earns that status by never being decorative:
   * it marks the destination dot in the mark, and a trip that is happening RIGHT
   * NOW. If it appears anywhere else it stops meaning "live".
   */
  live: string;
  liveSoft: string;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Rafeeq / «مسار» — one identity, one scheme.
 *
 * ── What changed in phase 4, and why it mattered more than it looks ───────
 *
 * This file used to define TWO palettes in the RETIRED identity: navy #002045
 * with a teal #006A65 accent. Both were replaced by decision 2 (brand blue
 * #1259E3, no secondary colour, light only) — but nothing ever came back to
 * change the code, so every screen in both mobile apps was still rendering the
 * dead brand while the design documents, the store assets, the README and the
 * marketing all showed the new one. The identity was settled everywhere except
 * in the product.
 *
 * The dark palette is gone too (decision 7). It was not merely unused: the
 * settings screen in BOTH apps still offered a moon/sun toggle, so a user could
 * switch into a scheme that nobody designed against, nobody screenshotted, and
 * nobody tested — 46 `dark:` classes deep. A theme that exists only far enough
 * to be reachable is worse than no theme, because the first person to find it
 * concludes the app is broken.
 *
 * Values are the canonical ramp from `docs/design/src/kit.css`, copied by hand
 * exactly once. Phase 6 replaces this file with a generated `packages/tokens`
 * so there is no hand copy at all — until then, kit.css is the source and this
 * is the only mirror.
 * ───────────────────────────────────────────────────────────────────────── */

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Brand ramp — kit.css --b50 … --b900
const B50 = '#EFF6FF';
const B100 = '#DBEAFE';
const B200 = '#BFDBFE';
const B600 = '#1259E3';
const B700 = '#0E47B4';
const B800 = '#0F3A8C';

// Neutrals — kit.css --n0 … --n900
const N0 = '#FFFFFF';
const N50 = '#F2F5F9';
const N100 = '#E9EDF4';
const N200 = '#DDE3EC';
const N300 = '#C6CEDA';
const N500 = '#67728A';
const N600 = '#4E5872';
const N900 = '#0E1524';

// Semantics — kit.css --ok / --bad / --warn / --live
const OK = '#047857';
const BAD = '#D92D20';
const WARN = '#B45309';
const LIVE = '#F59E0B';

const palette: ThemeColors = {
  primary: B600,
  primaryDark: B700,
  primarySoft: hexToRgba(B600, 0.08),
  // Same hue as primary, on purpose. There is no second interactive colour.
  accent: B600,
  accentSoft: hexToRgba(B600, 0.1),
  onPrimary: N0,
  onAccent: N0,
  accentBright: B200,
  primaryContainer: B800,
  onPrimaryMuted: B200,
  textInverse: N0,
  background: N50,
  surface: N0,
  card: N0,
  elevated: N0,
  surfaceAlt: B50,
  surfaceHigh: B100,
  surfaceHighest: B200,
  text: N900,
  textSecondary: N600,
  muted: N500,
  border: N300,
  hairline: N200,
  success: OK,
  warning: WARN,
  danger: BAD,
  // Informational, not a third colour — the brand blue at low emphasis.
  info: B700,
  successSoft: '#ECFDF5',
  warningSoft: '#FFFBEB',
  dangerSoft: '#FEF3F2',
  infoSoft: B50,
  overlay: hexToRgba(N900, 0.42),
  scrim: hexToRgba(N900, 0.62),
  live: LIVE,
  liveSoft: '#FEF3C7',
};

/**
 * The palette. `role` is accepted and ignored — all three apps share one
 * identity, and a per-role palette is exactly how two of them drifted apart
 * before. Kept in the signature so callers need not change.
 */
export function buildTheme(_role: ThemeRole = 'student'): ThemeColors {
  return palette;
}

/** Layered brand chrome tone. */
export const PRIMARY_CONTAINER = B800;

/** Unused surface kept deliberately empty: there is one neutral ramp. */
export const NEUTRAL_100 = N100;
