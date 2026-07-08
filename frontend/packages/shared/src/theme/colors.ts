/**
 * Brand constants — Design System "Stitch" (Deep Royal Blue + Smart Teal).
 *
 * The single source of truth for runtime theming is `scheme.ts`
 * (`buildTheme` → `ThemeColors`). This `palette` object holds ONLY the raw
 * brand constants used by a few *static* surfaces that must render without the
 * theme provider (e.g. BrandSplash, ErrorBoundary). Keep it aligned with
 * `scheme.ts`. The design is light-mode only — no dark identities, no legacy
 * ink/navy-gold/onyx colors.
 */
export const palette = {
  // Deep royal blue — brand anchor used for splash / self-contained surfaces.
  navy: '#002045',
  navyContainer: '#1A365D',
  navyDeep: '#001B3C',

  // Smart teal — AI / live / success accent.
  accent: '#006A65',
  accentBright: '#4EDBD2',

  // Neutrals
  white: '#FFFFFF',
  background: '#F9F9FF',
  surface: '#FFFFFF',
  border: '#C4C6CF',
  hairline: '#E7EEFF',
  muted: '#74777F',
  textPrimary: '#111C2C',
  textSecondary: '#43474E',
  textInverse: '#FFFFFF',

  // Semantic status (meaning only)
  success: '#006A65',
  warning: '#F79009',
  danger: '#BA1A1A',
  info: '#006A65',

  // Utility
  overlay: 'rgba(0, 32, 69, 0.5)',
  transparent: 'transparent',
} as const;
