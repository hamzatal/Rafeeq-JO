/**
 * Brand constants — Design System v7 "Onyx" (ink + signature blue).
 *
 * The single source of truth for runtime theming is `scheme.ts`
 * (`buildTheme` → `ThemeColors`), which is scheme-aware (light/dark). This
 * `palette` object holds ONLY the raw brand constants used by a few *static*
 * surfaces that must render without the theme provider (e.g. BrandSplash,
 * ErrorBoundary). Keep it aligned with `scheme.ts`. Do NOT add per-app theme
 * objects here — no gold, no navy, no legacy identities.
 */
export const palette = {
  // Structural ink — deep canvas for splash / self-contained dark surfaces.
  ink: '#0A0D12',
  inkSurface: '#12161D',
  inkCard: '#171C24',

  // Signature interactive blue (matches scheme.ts BLUE_LIGHT / BLUE_DARK).
  accent: '#2F6BFF',
  accentBright: '#5B8CFF', // brighter blue for legibility on near-black

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
