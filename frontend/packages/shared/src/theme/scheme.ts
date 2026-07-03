export type ColorScheme = 'light' | 'dark';
export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  /** Brand navy — structural color: primary buttons, headers, active states. */
  primary: string;
  primaryDark: string;
  primarySoft: string;
  /** Gold — premium accent: highlights, badges, key premium CTAs. */
  accent: string;
  /** Tinted accent background (chips, soft highlights). */
  accentSoft: string;
  /** Text/icon color on a navy primary surface (white). */
  onPrimary: string;
  /** Text/icon color on the gold accent — always near-navy ink for contrast. */
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
  /** Positive / accept / go (green) — semantic only, never brand. */
  success: string;
  warning: string;
  /** Destructive / reject / delete (red) — semantic only, never brand. */
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

// Semantic status colors — reserved for MEANING only (not brand identity):
// success = positive/accept/go, danger = destructive/reject, warning, info.
const status = {
  success: '#16A34A',
  warning: '#E0930C',
  danger: '#DC2626',
  info: '#2563EB',
};

// ─────────────────────────────────────────────────────────────────────────
// Brand — Design System v6 "Navy + Gold" (premium / academic).
// Identity: a deep royal NAVY as the structural/primary color (buttons, headers,
// active states, key icons) paired with a warm GOLD accent reserved for premium
// highlights, active/online states, badges and special CTAs (gold surface always
// carries near-navy ink for contrast). Neutral canvas keeps it clean and modern.
// Semantic green/red are used ONLY for meaning (accept / destructive).
// ─────────────────────────────────────────────────────────────────────────
const NAVY_LIGHT = '#243B7A'; // brand primary on light surfaces
const NAVY_DARK = '#5B7BD6'; // brighter royal blue for dark surfaces (contrast)
const GOLD_LIGHT = '#E7A63A'; // gold accent on light surfaces
const GOLD_DARK = '#F0B44E'; // slightly brighter gold for dark surfaces
const INK = '#141C33'; // near-navy black — text on gold, deepest ink

const roleAccent: Record<ThemeRole, { light: string; dark: string }> = {
  // Unified family: same navy + gold across all three apps. Differentiation is
  // done at the layout / density level, not by changing the brand hue.
  student: { light: GOLD_LIGHT, dark: GOLD_DARK },
  driver: { light: GOLD_LIGHT, dark: GOLD_DARK },
  admin: { light: GOLD_LIGHT, dark: GOLD_DARK },
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
  background: '#F7F8FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#141C33',
  textSecondary: '#5B6478',
  muted: '#8A93A6',
  border: '#E6E9F0',
  hairline: '#F0F2F7',
  overlay: 'rgba(20,28,51,0.45)',
  scrim: 'rgba(20,28,51,0.6)',
};

// Dark mode — a deep navy-charcoal canvas (premium, not pure black), with
// layered elevation. Keeps the royal identity even in the dark.
const neutralsDark = {
  background: '#0D1220',
  surface: '#141B2E',
  card: '#1A2337',
  elevated: '#222C45',
  text: '#EDF0F7',
  textSecondary: '#A6AEC2',
  muted: '#6E7794',
  border: '#26304A',
  hairline: '#1E2740',
  overlay: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(5,8,18,0.72)',
};

/** Build a full semantic palette for a role + scheme. */
export function buildTheme(role: ThemeRole, scheme: ColorScheme): ThemeColors {
  const isDark = scheme === 'dark';
  const neutrals = isDark ? neutralsDark : neutralsLight;
  const accent = isDark ? roleAccent[role].dark : roleAccent[role].light;
  const primary = isDark ? NAVY_DARK : NAVY_LIGHT;
  const onPrimary = '#FFFFFF';
  const softAlpha = isDark ? 0.2 : 0.12;

  return {
    primary,
    primaryDark: isDark ? '#8AA2E6' : '#1A2C5C',
    primarySoft: hexToRgba(primary, isDark ? 0.26 : 0.12),
    accent,
    accentSoft: hexToRgba(accent, isDark ? 0.24 : 0.18),
    onPrimary,
    onAccent: INK,
    textInverse: '#FFFFFF',
    ...neutrals,
    ...status,
    successSoft: hexToRgba(status.success, softAlpha),
    warningSoft: hexToRgba(status.warning, softAlpha),
    dangerSoft: hexToRgba(status.danger, softAlpha),
    infoSoft: hexToRgba(status.info, softAlpha),
  };
}
