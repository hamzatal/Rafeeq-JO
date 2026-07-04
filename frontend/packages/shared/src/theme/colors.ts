/**
 * Brand palette — Design System v7 "Onyx" (ink + signature blue).
 *
 * NOTE: The single source of truth for runtime theming is `scheme.ts`
 * (`buildTheme` → `ThemeColors`), which is scheme-aware (light/dark). This
 * `palette` object holds only the raw brand constants used by a few static
 * surfaces (e.g. BrandSplash). Do NOT add per-app theme objects here.
 * Key names are kept (primary/gold/navy) for backwards-compat with static
 * consumers; `gold` now maps to the signature BLUE accent.
 */
export const palette = {
  // Brand — Ink + signature blue
  primary: '#0F1216', // structural ink (splash background / dark surfaces)
  primaryDark: '#000000',
  gold: '#2F6BFF', // signature blue accent (was gold)
  goldDark: '#1B4DCC',
  navy: '#0A0D12', // deepest ink (splash / dark canvas)
  navySurface: '#171C24', // raised dark surface

  // Neutrals
  white: '#FFFFFF',
  background: '#F4F6F8',
  surface: '#FFFFFF',
  border: '#E7EAEF',
  muted: '#98A2B3',
  textPrimary: '#0F1216',
  textSecondary: '#59616E',
  textInverse: '#FFFFFF',

  // Semantic status (meaning only — never brand)
  success: '#12B76A',
  warning: '#F79009',
  danger: '#F04438',
  info: '#2F6BFF',

  // Utility
  overlay: 'rgba(15, 18, 22, 0.5)',
  transparent: 'transparent',
} as const;
