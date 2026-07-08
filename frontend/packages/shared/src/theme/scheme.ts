export type ColorScheme = 'light' | 'dark';
export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  /** Deep Royal Blue — primary buttons, headers, active anchors. Carries white text in BOTH schemes. */
  primary: string;
  primaryDark: string;
  primarySoft: string;
  /** Smart Teal — AI features, live tracking, success/completion, links. */
  accent: string;
  accentSoft: string;
  onPrimary: string;
  onAccent: string;
  background: string;
  surface: string;
  card: string;
  elevated: string;
  /** Subtle tinted container (inputs, quiet tiles) — lavender on light, deep slate on dark. */
  surfaceAlt: string;
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
}

// ─────────────────────────────────────────────────────────────────────────
// Rafeeq Design System — "Stitch" (the single, final identity).
// Deep Royal Blue (#002045) + Smart Teal (#006A65) on a clean canvas.
//
// TWO schemes are supported — LIGHT (default) and DARK — plus Arabic (default)
// and English. The default for all three apps is Arabic + Light (see prefs).
// In BOTH schemes the primary stays a navy that carries WHITE text, so brand
// buttons/cards read consistently; dark simply darkens the canvas and lifts
// the accent/teal for contrast.
// ─────────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const NAVY = '#002045';
const NAVY_CONTAINER = '#1A365D';
const TEAL = '#006A65';

const light: ThemeColors = {
  primary: NAVY,
  primaryDark: '#001B3C',
  primarySoft: hexToRgba(NAVY, 0.08),
  accent: TEAL,
  accentSoft: hexToRgba(TEAL, 0.12),
  onPrimary: '#FFFFFF',
  onAccent: '#FFFFFF',
  textInverse: '#FFFFFF',
  background: '#F9F9FF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  surfaceAlt: '#F0F3FF',
  text: '#111C2C',
  textSecondary: '#43474E',
  muted: '#74777F',
  border: '#C4C6CF',
  hairline: '#E7EEFF',
  success: TEAL,
  warning: '#F79009',
  danger: '#BA1A1A',
  info: TEAL,
  successSoft: hexToRgba(TEAL, 0.12),
  warningSoft: hexToRgba('#F79009', 0.12),
  dangerSoft: hexToRgba('#BA1A1A', 0.1),
  infoSoft: hexToRgba(TEAL, 0.12),
  overlay: hexToRgba(NAVY, 0.42),
  scrim: hexToRgba(NAVY, 0.62),
};

// Dark: a deep navy canvas. Primary stays a (slightly lifted) navy so white
// text remains valid; teal brightens for contrast on dark surfaces.
const DARK_PRIMARY = '#2A4E86';
const DARK_TEAL = '#33C6BC';
const dark: ThemeColors = {
  primary: DARK_PRIMARY,
  primaryDark: '#16305A',
  primarySoft: hexToRgba(DARK_PRIMARY, 0.28),
  accent: DARK_TEAL,
  accentSoft: hexToRgba(DARK_TEAL, 0.18),
  onPrimary: '#FFFFFF',
  onAccent: '#04211F',
  textInverse: '#FFFFFF',
  background: '#0E1626',
  surface: '#16203A',
  card: '#1B2742',
  elevated: '#22304E',
  surfaceAlt: '#1E2B47',
  text: '#E8EDF7',
  textSecondary: '#AEB7C8',
  muted: '#7E889B',
  border: '#33405C',
  hairline: '#26324E',
  success: DARK_TEAL,
  warning: '#FFB870',
  danger: '#FFB4AB',
  info: DARK_TEAL,
  successSoft: hexToRgba(DARK_TEAL, 0.18),
  warningSoft: hexToRgba('#FFB870', 0.16),
  dangerSoft: hexToRgba('#FFB4AB', 0.16),
  infoSoft: hexToRgba(DARK_TEAL, 0.18),
  overlay: 'rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.72)',
};

/**
 * Build the Stitch palette for the given scheme. `role` is accepted for
 * backward compatibility (all apps share the navy + teal identity). Default
 * scheme is light; dark is a fully supported alternative.
 */
export function buildTheme(_role: ThemeRole = 'student', scheme: ColorScheme = 'light'): ThemeColors {
  return scheme === 'dark' ? dark : light;
}

/** Navy container tone — secondary chrome layered on primary. */
export const PRIMARY_CONTAINER = NAVY_CONTAINER;
