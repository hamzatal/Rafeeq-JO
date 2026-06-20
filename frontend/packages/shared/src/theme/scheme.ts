export type ColorScheme = 'light' | 'dark';
export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  onPrimary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  overlay: string;
}

const status = {
  success: '#16A34A',
  warning: '#E0930C',
  danger: '#DC2626',
  info: '#0EA5E9',
};

// Role accent (brand) per app. All three personas share a navy + bright-accent
// system: a deep navy is the primary action in LIGHT mode, and the bright
// accent (gold / cyan) becomes the primary action in DARK mode so it stays
// visible on the navy canvas.
// student = Deep Navy (#0B192C) + Heritage Gold (#FFBF00).
// driver  = Deep Navy (#0B2C42) + Cyan (#00E5FF).
// admin   = Deep Navy (#0B192C) + Cyan (#00E5FF).
const roleAccent: Record<ThemeRole, { primary: string; primaryDark: string; accent: string; onPrimary: string }> = {
  student: { primary: '#0B192C', primaryDark: '#06101D', accent: '#FFBF00', onPrimary: '#FFFFFF' },
  driver: { primary: '#0B2C42', primaryDark: '#06121F', accent: '#00E5FF', onPrimary: '#FFFFFF' },
  admin: { primary: '#0B192C', primaryDark: '#001F3F', accent: '#00E5FF', onPrimary: '#FFFFFF' },
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
  background: '#F4F7FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#94A3B8',
  border: '#E2E8F0',
  overlay: 'rgba(11,25,44,0.45)',
};

const neutralsDark = {
  background: '#06121F',
  surface: '#0E2747',
  card: '#13314F',
  text: '#E6EEF7',
  textSecondary: '#90A4BC',
  muted: '#5A6B7B',
  border: '#1E3A5F',
  overlay: 'rgba(0,0,0,0.6)',
};

/** Build a full semantic palette for a role + scheme. */
export function buildTheme(role: ThemeRole, scheme: ColorScheme): ThemeColors {
  const accent = roleAccent[role];

  // Light/dark is now honoured for ALL apps (including the captain app, which
  // previously forced a dark HUD and ignored the user's preference).
  const neutrals = scheme === 'dark' ? neutralsDark : neutralsLight;

  // In dark mode the navy primary would vanish on the navy canvas, so the
  // role's bright accent (gold for student, cyan for driver/admin) becomes the
  // primary action instead.
  let primary = accent.primary;
  let onPrimary = accent.onPrimary;
  if (scheme === 'dark') {
    primary = accent.accent;
    onPrimary = '#06121F';
  }
  const primarySoft = hexToRgba(accent.accent, scheme === 'dark' ? 0.18 : 0.12);

  return {
    primary,
    primaryDark: accent.primaryDark,
    primarySoft,
    accent: accent.accent,
    onPrimary,
    ...neutrals,
    ...status,
  };
}
