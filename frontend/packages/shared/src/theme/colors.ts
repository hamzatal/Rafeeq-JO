/**
 * Brand palette — Design System v6 "Navy + Gold" (premium / academic).
 *
 * NOTE: The single source of truth for runtime theming is `scheme.ts`
 * (`buildTheme` → `ThemeColors`), which is scheme-aware (light/dark). This
 * `palette` object holds only the raw brand constants used by a few static
 * surfaces (e.g. BrandSplash). Do NOT add per-app theme objects here.
 */
export const palette = {
  // Brand — Navy + Gold
  primary: '#243B7A', // royal navy (structural / primary)
  primaryDark: '#1A2C5C',
  gold: '#E7A63A', // premium gold accent
  goldDark: '#B47E1C',
  navy: '#0D1220', // deepest navy-charcoal (dark surfaces / splash)
  navySurface: '#1A2337', // raised dark surface

  // Neutrals
  white: '#FFFFFF',
  background: '#F7F8FB',
  surface: '#FFFFFF',
  border: '#E6E9F0',
  muted: '#8A93A6',
  textPrimary: '#141C33',
  textSecondary: '#5B6478',
  textInverse: '#FFFFFF',

  // Semantic status (meaning only — never brand)
  success: '#16A34A',
  warning: '#E0930C',
  danger: '#DC2626',
  info: '#2563EB',

  // Utility
  overlay: 'rgba(20, 28, 51, 0.5)',
  transparent: 'transparent',
} as const;
