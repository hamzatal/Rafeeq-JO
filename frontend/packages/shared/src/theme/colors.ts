/**
 * Rafeeq brand color palettes.
 * Philosophy: "Trust First" — professional, calm, bank-grade.
 */

// Shared semantic colors used across both apps.
export const palette = {
  // Brand — Jordan-inspired
  primary: '#0B7A43', // Jordan green
  primaryDark: '#075C32',
  gold: '#E6B23E', // Heritage gold
  red: '#CE1126', // Jordan red
  navy: '#0E261C', // Deep green-black (driver/dark surfaces)
  navySurface: '#163524', // Driver cards / dark surfaces

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
export const studentTheme: AppTheme = {
  primary: palette.primary,
  accent: palette.gold,
  background: palette.background,
  surface: palette.surface,
  card: palette.surface,
  text: palette.textPrimary,
  textSecondary: palette.textSecondary,
  border: palette.border,
  ...statusColors(),
};

// Driver app theme (dark navy + gold).
export const driverTheme: AppTheme = {
  primary: palette.gold,
  accent: palette.gold,
  background: palette.navy,
  surface: palette.navySurface,
  card: palette.navySurface,
  text: palette.white,
  textSecondary: '#CBD5E1',
  border: '#334155',
  ...statusColors(),
};

function statusColors() {
  return {
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    info: palette.info,
  };
}

export interface AppTheme {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}
export type ThemeName = 'student' | 'driver';

export const themes: Record<ThemeName, AppTheme> = {
  student: studentTheme,
  driver: driverTheme,
};
