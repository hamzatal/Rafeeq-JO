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
  /** Text/icon color that sits on the (lime) accent — always near-black. */
  onAccent: string;
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

// Brand — Design System v5 (inDrive-inspired, not a copy).
// Identity = clean neutral canvas + near-black ink for text/icons/dark panels,
// with a single vivid LIME accent reserved for the primary action (lime button
// with black text) and key highlights. Same simple, confident idea as inDrive.
const ACCENT = '#C1F11D'; // signature lime
const roleAccent: Record<ThemeRole, { accent: string }> = {
  student: { accent: ACCENT },
  driver: { accent: ACCENT },
  admin: { accent: ACCENT },
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
  const accent = roleAccent[role].accent;
  const isDark = scheme === 'dark';
  const neutrals = isDark ? neutralsDark : neutralsLight;

  // inDrive-style: "primary" is a near-black ink in light (white in dark) — used
  // for text, icons, active states and dark panels. The LIME accent is the
  // primary ACTION color (buttons), always with near-black text on it.
  const primary = isDark ? '#F4F4F6' : '#15171C';
  const onPrimary = isDark ? '#0A0A0C' : '#FFFFFF';
  const softAlpha = isDark ? 0.2 : 0.12;

  return {
    primary,
    primaryDark: isDark ? '#FFFFFF' : '#000000',
    primarySoft: hexToRgba(accent, isDark ? 0.24 : 0.16),
    accent,
    accentSoft: hexToRgba(accent, isDark ? 0.24 : 0.18),
    onPrimary,
    onAccent: '#0A0A0C',
    textInverse: '#FFFFFF',
    ...neutrals,
    ...status,
    successSoft: hexToRgba(status.success, softAlpha),
    warningSoft: hexToRgba(status.warning, softAlpha),
    dangerSoft: hexToRgba(status.danger, softAlpha),
    infoSoft: hexToRgba(status.info, softAlpha),
  };
}
