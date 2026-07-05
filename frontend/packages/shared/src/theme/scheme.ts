export type ColorScheme = 'light' | 'dark';
export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  /** Structural ink — primary buttons, headers, active anchors, key surfaces. */
  primary: string;
  primaryDark: string;
  primarySoft: string;
  /** Signature blue — interactive highlight: selected states, links, online, key CTAs. */
  accent: string;
  /** Tinted accent background (chips, soft highlights, focus rings). */
  accentSoft: string;
  /** Text/icon color on the primary (ink) surface. */
  onPrimary: string;
  /** Text/icon color on the blue accent surface (always white). */
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
  /**
   * A premium "showcase" surface (wallet / subscription / rewards hero cards)
   * that stays a deep-ink card carrying white content in BOTH light and dark
   * themes — like a physical card. Unlike `primary`, it never flips to
   * near-white, so hero text on it is always legible.
   */
  ink: string;
  onInk: string;
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
  success: '#12B76A',
  warning: '#F79009',
  danger: '#F04438',
  info: '#2F6BFF',
};

// ─────────────────────────────────────────────────────────────────────────
// Rafeeq Design System v7 — "Onyx".
// A premium, formal, globally-legible identity built on three pillars:
//   1. INK  — a near-black structural color for primary buttons, headers,
//      active anchors and hero surfaces. This is the calm, serious anchor.
//   2. SIGNATURE BLUE — one confident interactive accent for selected states,
//      links, the online indicator and key call-to-actions. Blue always
//      carries white text.
//   3. A soft, near-white canvas (light) / deep ink canvas (dark) with real
//      LAYERED ELEVATION instead of hard borders — this is what makes it feel
//      modern and expensive rather than flat.
// Semantic green/amber/red are used ONLY for meaning (accept / warn / reject).
// This is our own system: no gold, no navy-heavy chrome, no toy colors.
// ─────────────────────────────────────────────────────────────────────────
const INK_LIGHT = '#0F1216'; // structural ink on light surfaces (buttons/headers)
const INK_DARK = '#F4F6F8'; // on dark surfaces the "ink" role flips to near-white
const BLUE_LIGHT = '#2F6BFF'; // signature interactive blue on light
const BLUE_DARK = '#5B8CFF'; // slightly brighter blue for dark surfaces (contrast)

const roleAccent: Record<ThemeRole, { light: string; dark: string }> = {
  // Unified family: same ink + signature blue across all three apps.
  // Differentiation is done at the layout / density level, not by hue.
  student: { light: BLUE_LIGHT, dark: BLUE_DARK },
  driver: { light: BLUE_LIGHT, dark: BLUE_DARK },
  admin: { light: BLUE_LIGHT, dark: BLUE_DARK },
};

/** hex (#RRGGBB) → rgba string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Light — a soft, near-white canvas (not glaring pure white) with pure-white
// cards floating on subtle layered shadows. Ink text, generous neutrals.
const neutralsLight = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#0F1216',
  textSecondary: '#59616E',
  muted: '#98A2B3',
  border: '#E7EAEF',
  hairline: '#F1F3F6',
  overlay: 'rgba(15,18,22,0.42)',
  scrim: 'rgba(15,18,22,0.62)',
};

// Dark — a true deep-ink canvas (premium, not muddy) with clearly layered
// elevation: background → surface → card → elevated each step lighter.
const neutralsDark = {
  background: '#0A0D12',
  surface: '#12161D',
  card: '#171C24',
  elevated: '#1F2630',
  text: '#F4F6F8',
  textSecondary: '#A2ABB9',
  muted: '#6B7686',
  border: '#242B36',
  hairline: '#1A2028',
  overlay: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.74)',
};

/** Build a full semantic palette for a role + scheme. */
export function buildTheme(role: ThemeRole, scheme: ColorScheme): ThemeColors {
  const isDark = scheme === 'dark';
  const neutrals = isDark ? neutralsDark : neutralsLight;
  const accent = isDark ? roleAccent[role].dark : roleAccent[role].light;
  const primary = isDark ? INK_DARK : INK_LIGHT;
  // On light, the ink primary carries white text; on dark, the primary flips to
  // near-white so it must carry ink text.
  const onPrimary = isDark ? '#0A0D12' : '#FFFFFF';
  const softAlpha = isDark ? 0.22 : 0.12;

  return {
    primary,
    primaryDark: isDark ? '#FFFFFF' : '#000000',
    primarySoft: hexToRgba(primary, isDark ? 0.16 : 0.08),
    accent,
    accentSoft: hexToRgba(accent, isDark ? 0.24 : 0.12),
    onPrimary,
    onAccent: '#FFFFFF',
    textInverse: '#FFFFFF',
    // Deep-ink showcase surface. On the light canvas it is a rich near-black
    // card; on the dark canvas it is a slightly-elevated ink that still sits
    // clearly above the background. White content is legible on both.
    ink: isDark ? '#1B222E' : '#12161D',
    onInk: '#FFFFFF',
    ...neutrals,
    ...status,
    successSoft: hexToRgba(status.success, softAlpha),
    warningSoft: hexToRgba(status.warning, softAlpha),
    dangerSoft: hexToRgba(status.danger, softAlpha),
    infoSoft: hexToRgba(status.info, softAlpha),
  };
}
