export type ColorScheme = 'light' | 'dark';
export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  /** Deep Royal Blue — primary buttons, headers, active anchors, key surfaces. */
  primary: string;
  primaryDark: string;
  primarySoft: string;
  /** Smart Teal — AI features, live tracking, success/completion states, links. */
  accent: string;
  /** Tinted accent background (chips, soft highlights, focus rings). */
  accentSoft: string;
  /** Text/icon color on the primary (navy) surface. */
  onPrimary: string;
  /** Text/icon color on the teal accent surface (always white). */
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
  /** Positive / accept / go / completion — Smart Teal per Stitch design. */
  success: string;
  warning: string;
  /** Destructive / reject / delete (coral-red) — semantic only. */
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

// ─────────────────────────────────────────────────────────────────────────
// Rafeeq Design System — "Stitch" (THE single, final identity).
// Source of truth: docs/03-DESIGN-SYSTEM.md + stitch_rafeeq_ai_student_platform.zip.
//
// Pillars:
//   1. DEEP ROYAL BLUE (#002045) — the official, trusted anchor for primary
//      buttons, headers, navigation and grounding chrome. Carries white text.
//   2. SMART TEAL (#006A65) — the accent of innovation, used for AI features,
//      live-tracking indicators and successful-state completions.
//   3. An off-white canvas (#F9F9FF) with pure-white cards floating on very
//      soft, navy-tinted ambient shadows — a clean-room, "effortless control"
//      aesthetic.
//
// LIGHT-MODE ONLY (by design mandate). `buildTheme` keeps the (role, scheme)
// signature for backward compatibility but ALWAYS returns the light Stitch
// palette — there is no dark theme.
// ─────────────────────────────────────────────────────────────────────────

const NAVY = '#002045'; // primary — deep royal blue
const NAVY_CONTAINER = '#1A365D'; // primary-container
const NAVY_DEEP = '#001B3C'; // on-primary-fixed (pressed/darker)
const TEAL = '#006A65'; // secondary — smart teal (AI / live / success)

/** hex (#RRGGBB) → rgba string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Semantic status. `success`/`info` use Smart Teal to match the Stitch spec
// (completed steps + successful states are teal). Warning amber, danger coral.
const status = {
  success: TEAL,
  warning: '#F79009',
  danger: '#BA1A1A',
  info: TEAL,
};

// Off-white canvas with pure-white floating cards + generous neutrals.
const neutrals = {
  background: '#F9F9FF', // surface / background
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#111C2C', // on-surface
  textSecondary: '#43474E', // on-surface-variant
  muted: '#74777F', // outline
  border: '#C4C6CF', // outline-variant
  hairline: '#E7EEFF', // surface-container
  overlay: hexToRgba(NAVY, 0.42),
  scrim: hexToRgba(NAVY, 0.62),
};

/**
 * Build the Stitch palette. `role` and `scheme` are accepted for backward
 * compatibility but do not change the palette: all three apps share the same
 * navy + teal identity, and the design is light-mode only.
 */
export function buildTheme(_role: ThemeRole = 'student', _scheme: ColorScheme = 'light'): ThemeColors {
  return {
    primary: NAVY,
    primaryDark: NAVY_DEEP,
    primarySoft: hexToRgba(NAVY, 0.08),
    accent: TEAL,
    accentSoft: hexToRgba(TEAL, 0.12),
    onPrimary: '#FFFFFF',
    onAccent: '#FFFFFF',
    textInverse: '#FFFFFF',
    ...neutrals,
    ...status,
    successSoft: hexToRgba(status.success, 0.12),
    warningSoft: hexToRgba(status.warning, 0.12),
    dangerSoft: hexToRgba(status.danger, 0.1),
    infoSoft: hexToRgba(status.info, 0.12),
  };
}

/** Navy container tone — for secondary chrome layered on the primary. */
export const PRIMARY_CONTAINER = NAVY_CONTAINER;
