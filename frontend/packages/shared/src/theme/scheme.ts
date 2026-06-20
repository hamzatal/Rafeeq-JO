export type ColorScheme = 'light' | 'dark';
export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  /** Tinted accent background (chips, soft highlights). */
  accentSoft: string;
  onPrimary: string;
  background: string;
  surface: string;
  card: string;
  /** A raised surface for sheets / modals (slightly distinct from card). */
  elevated: string;
  text: string;
  textSecondary: string;
  muted: string;
  /** Text/icon color that sits on a colored (primary/accent) surface. */
  textInverse: string;
  border: string;
  /** A very subtle divider, lighter than `border`. */
  hairline: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Soft tinted backgrounds for status pills / banners. */
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  infoSoft: string;
  /** Light scrim used behind cards on maps. */
  overlay: string;
  /** Stronger scrim used behind modals / bottom sheets. */
  scrim: string;
}

const status = {
  success: '#16A34A',
  warning: '#E0930C',
  danger: '#DC2626',
  info: '#0EA5E9',
};

// Role accent (brand) per app — Design System v4 (radical refresh).
// A single modern INDIGO brand primary is shared across the whole platform for
// a cohesive identity, with a per-role ACCENT for subtle differentiation.
// The primary stays the brand colour in BOTH light and dark (the true-dark
// canvas keeps indigo perfectly readable); a slightly brighter indigo is used
// in dark mode for contrast.
//   student → indigo + amber · driver → indigo + emerald · admin → indigo + cyan
const roleAccent: Record<
  ThemeRole,
  { primary: string; primaryDark: string; primaryBright: string; accent: string }
> = {
  student: { primary: '#4F46E5', primaryDark: '#4338CA', primaryBright: '#6366F1', accent: '#FBBF24' },
  driver: { primary: '#4F46E5', primaryDark: '#4338CA', primaryBright: '#6366F1', accent: '#34D399' },
  admin: { primary: '#4F46E5', primaryDark: '#4338CA', primaryBright: '#6366F1', accent: '#22D3EE' },
};

/** hex (#RRGGBB) → rgba string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const neutralsLight = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#15171C',
  textSecondary: '#5A616E',
  muted: '#9AA0AC',
  border: '#ECEEF2',
  hairline: '#F2F4F7',
  overlay: 'rgba(15,18,28,0.45)',
  scrim: 'rgba(15,18,28,0.55)',
};

// TRUE dark mode — a near-black, neutral charcoal canvas (NOT navy blue), with
// layered elevation. This is the modern "real dark" the product needs.
const neutralsDark = {
  background: '#0A0A0C',
  surface: '#141417',
  card: '#1B1B20',
  elevated: '#232329',
  text: '#F4F4F6',
  textSecondary: '#A1A1AC',
  muted: '#6E6E78',
  border: '#2A2A31',
  hairline: '#202026',
  overlay: 'rgba(0,0,0,0.55)',
  scrim: 'rgba(0,0,0,0.72)',
};

/** Build a full semantic palette for a role + scheme. */
export function buildTheme(role: ThemeRole, scheme: ColorScheme): ThemeColors {
  const accent = roleAccent[role];
  const isDark = scheme === 'dark';
  const neutrals = isDark ? neutralsDark : neutralsLight;

  // The indigo brand primary is the primary action in BOTH modes (a brighter
  // indigo in dark for contrast). White text always sits on it.
  const primary = isDark ? accent.primaryBright : accent.primary;
  const primarySoft = hexToRgba(accent.primary, isDark ? 0.24 : 0.1);
  const softAlpha = isDark ? 0.2 : 0.12;

  return {
    primary,
    primaryDark: accent.primaryDark,
    primarySoft,
    accent: accent.accent,
    accentSoft: hexToRgba(accent.accent, isDark ? 0.22 : 0.14),
    onPrimary: '#FFFFFF',
    textInverse: '#FFFFFF',
    ...neutrals,
    ...status,
    successSoft: hexToRgba(status.success, softAlpha),
    warningSoft: hexToRgba(status.warning, softAlpha),
    dangerSoft: hexToRgba(status.danger, softAlpha),
    infoSoft: hexToRgba(status.info, softAlpha),
  };
}
