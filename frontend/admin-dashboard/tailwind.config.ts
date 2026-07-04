import type { Config } from 'tailwindcss';

/**
 * Admin Console — Design System v7 "Onyx".
 * INK = structural/brand (sidebar, table headers, primary buttons, dark ink).
 * SIGNATURE BLUE = interactive accent (active nav, highlights, links, info pills).
 * Soft near-white canvas (light) / deep-ink canvas (dark) with layered shadows.
 *
 * NOTE (transitional): the `cyan.*` keys are aliased to the BLUE accent family so
 * the many existing `cyan-*` utility usages across pages render blue without a
 * mass rename. New code should use `accent` / `gold` (also blue) — the alias will
 * be removed once every page has been migrated.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — ink primary (structural: buttons, table headers, dark ink)
        primary: { DEFAULT: '#0F1216', dark: '#000000', light: '#2A2F37' },
        // "navy" = the deep ink surface family used for the sidebar / dark chrome
        navy: { DEFAULT: '#12161D', light: '#171C24', deep: '#0A0D12', 900: '#070A0E' },
        // Signature-blue accent family (was gold)
        gold: { DEFAULT: '#2F6BFF', soft: '#E8EFFF', deep: '#1B4DCC' },
        // Transitional alias: cyan-* → blue tones (see note above)
        cyan: { DEFAULT: '#2F6BFF', soft: '#E8EFFF', deep: '#1B4DCC' },
        accent: '#2F6BFF',
        // Neutrals
        background: '#F4F6F8',
        surface: '#FFFFFF',
        line: '#E7EAEF',
        ink: '#0F1216',
        muted: '#59616E',
        // Status (meaning only)
        success: '#12B76A',
        warning: '#F79009',
        danger: '#F04438',
        info: '#2F6BFF',
        // Dark scheme — deep ink (premium), layered elevation
        dbg: '#0A0D12',
        dsurface: '#12161D',
        dcard: '#171C24',
        dline: '#242B36',
        dtext: '#F4F6F8',
        dmuted: '#A2ABB9',
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 6px rgba(11, 18, 32, 0.06), 0 1px 2px rgba(11, 18, 32, 0.04)',
        lift: '0 8px 24px rgba(11, 18, 32, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
