/**
 * Rafeeq brand color palettes.
 * Philosophy: "Trust First" — professional, calm, bank-grade.
 */

// Shared semantic colors used across both apps.
export const palette = {
  // Brand
  primary: '#2563EB', // Primary Blue
  gold: '#D4A017', // Royal Gold
  navy: '#0F172A', // Navy
  navySurface: '#1E293B', // Driver cards / dark surfaces

  // Neutrals
  white: '#FFFFFF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  muted: '#94A3B8',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textInverse: '#FFFFFF',

  // Status
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0EA5E9',

  // Utility
  overlay: 'rgba(15, 23, 42, 0.5)',
  transparent: 'transparent',
} as const;

// Student app theme (light, blue + gold).
export const studentTheme = {
  primary: palette.primary,
  accent: palette.gold,
  background: palette.background,
  surface: palette.surface,
  card: palette.surface,
  text: palette.textPrimary,
  textSecondary: palette.textSecondary,
  border: palette.border,
  ...statusColors(),
} as const;

// Driver app theme (dark navy + gold).
export const driverTheme = {
  primary: palette.gold,
  accent: palette.gold,
  background: palette.navy,
  surface: palette.navySurface,
  card: palette.navySurface,
  text: palette.white,
  textSecondary: '#CBD5E1',
  border: '#334155',
  ...statusColors(),
} as const;

function statusColors() {
  return {
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    info: palette.info,
  };
}

export type AppTheme = typeof studentTheme;
export type ThemeName = 'student' | 'driver';

export const themes: Record<ThemeName, AppTheme> = {
  student: studentTheme,
  driver: driverTheme,
};
