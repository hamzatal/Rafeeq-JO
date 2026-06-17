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
  danger: '#CE1126', // Jordan red
  info: '#0EA5E9',
};

// Role accent (brand) per app — Jordan-inspired: deep green + heritage gold.
const roleAccent: Record<ThemeRole, { primary: string; primaryDark: string; accent: string; onPrimary: string }> = {
  student: { primary: '#0B7A43', primaryDark: '#075C32', accent: '#E6B23E', onPrimary: '#FFFFFF' },
  driver: { primary: '#E6B23E', primaryDark: '#C7951F', accent: '#E6B23E', onPrimary: '#0E261C' },
  admin: { primary: '#0B7A43', primaryDark: '#075C32', accent: '#E6B23E', onPrimary: '#FFFFFF' },
};

const neutralsLight = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0E261C',
  textSecondary: '#516159',
  muted: '#9AA8A0',
  border: '#E4EAE6',
  overlay: 'rgba(14,38,28,0.45)',
};

const neutralsDark = {
  background: '#08130D',
  surface: '#0F2017',
  card: '#142A1E',
  text: '#ECF4EF',
  textSecondary: '#9FB3A8',
  muted: '#5E7268',
  border: '#214034',
  overlay: 'rgba(0,0,0,0.6)',
};

/** Build a full semantic palette for a role + scheme. */
export function buildTheme(role: ThemeRole, scheme: ColorScheme): ThemeColors {
  const accent = roleAccent[role];
  const neutrals = scheme === 'dark' ? neutralsDark : neutralsLight;

  // Lift the brand green slightly in dark mode for contrast.
  const primary = scheme === 'dark' && role !== 'driver' ? '#15A05A' : accent.primary;
  const primarySoft = scheme === 'dark' ? 'rgba(21,160,90,0.16)' : 'rgba(11,122,67,0.10)';

  return {
    primary,
    primaryDark: accent.primaryDark,
    primarySoft,
    accent: accent.accent,
    onPrimary: accent.onPrimary,
    ...neutrals,
    ...status,
  };
}
