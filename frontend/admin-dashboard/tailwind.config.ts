import type { Config } from 'tailwindcss';

/**
 * Admin Console — Design System v6 "Navy + Gold" (premium / academic).
 * Navy = structural/brand (sidebar, table headers, primary). Gold = premium
 * accent (active nav, highlights, info pills). Deep navy-charcoal dark scheme
 * matches the mobile apps.
 *
 * NOTE (transitional): the `cyan.*` keys are repointed to the GOLD family so the
 * many existing `cyan-*` utility usages across pages render gold without a mass
 * rename. Class names are being renamed to `gold-*` during the page-by-page
 * dashboard rebuild.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — navy primary
        primary: { DEFAULT: '#243B7A', dark: '#1A2C5C', light: '#3350A0' },
        // "navy" = deep royal navy used for sidebar / table headers / dark ink
        navy: { DEFAULT: '#141B2E', light: '#1A2337', deep: '#0D1220', 900: '#0A0F1C' },
        // Gold accent family
        gold: { DEFAULT: '#E7A63A', soft: '#FBEFD6', deep: '#B47E1C' },
        // Transitional alias: cyan-* → gold tones (see note above)
        cyan: { DEFAULT: '#E7A63A', soft: '#FBEFD6', deep: '#B47E1C' },
        accent: '#E7A63A',
        // Neutrals
        background: '#F7F8FB',
        surface: '#FFFFFF',
        line: '#E6E9F0',
        ink: '#141C33',
        muted: '#5B6478',
        // Status (meaning only)
        success: '#16A34A',
        warning: '#E0930C',
        danger: '#DC2626',
        info: '#2563EB',
        // Dark scheme — deep navy-charcoal (premium)
        dbg: '#0D1220',
        dsurface: '#141B2E',
        dcard: '#1A2337',
        dline: '#26304A',
        dtext: '#EDF0F7',
        dmuted: '#A6AEC2',
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(20, 28, 51, 0.06), 0 1px 2px rgba(20, 28, 51, 0.04)',
        lift: '0 8px 24px rgba(20, 28, 51, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
