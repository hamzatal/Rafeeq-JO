import { palette } from './colors';

export type ColorScheme = 'light' | 'dark';
export type ThemeRole = 'student' | 'driver' | 'admin';

export interface ThemeColors {
  primary: string;
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
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0EA5E9',
};

// Role accent (brand) per app.
const roleAccent: Record<ThemeRole, { primary: string; accent: string; onPrimary: string }> = {
  student: { primary: '#2563EB', accent: palette.gold, onPrimary: '#FFFFFF' },
  driver: { primary: palette.gold, accent: palette.gold, onPrimary: '#0F172A' },
  admin: { primary: '#2563EB', accent: palette.gold, onPrimary: '#FFFFFF' },
};

const neutralsLight = {
  background: '#F6F8FC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#94A3B8',
  border: '#E2E8F0',
  overlay: 'rgba(15,23,42,0.45)',
};

const neutralsDark = {
  background: '#0B1220',
  surface: '#131C2E',
  card: '#1B2840',
  text: '#F1F5F9',
  textSecondary: '#9FB0C7',
  muted: '#64748B',
  border: '#26344B',
  overlay: 'rgba(0,0,0,0.6)',
};

/** Build a full semantic palette for a role + scheme. */
export function buildTheme(role: ThemeRole, scheme: ColorScheme): ThemeColors {
  const accent = roleAccent[role];
  const neutrals = scheme === 'dark' ? neutralsDark : neutralsLight;

  // In dark mode, lift the student blue slightly for contrast.
  const primary =
    scheme === 'dark' && role !== 'driver' ? '#3B82F6' : accent.primary;

  return {
    primary,
    accent: accent.accent,
    onPrimary: accent.onPrimary,
    ...neutrals,
    ...status,
  };
}
