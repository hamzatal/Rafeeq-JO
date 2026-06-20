import type { Config } from 'tailwindcss';

/**
 * Rafeeq JO — Admin Command Center (Design System v4).
 * Unified indigo brand (#4F46E5) + cyan accent on a clean light canvas, with a
 * TRUE dark (near-black charcoal) scheme — matching the mobile apps' identity.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — indigo primary, cyan accent
        primary: { DEFAULT: '#4F46E5', dark: '#4338CA', light: '#6366F1' },
        // "navy" kept as the neutral charcoal ink / sidebar surface
        navy: { DEFAULT: '#15171C', light: '#232329', deep: '#0F1115', 900: '#0A0A0C' },
        cyan: { DEFAULT: '#22D3EE', soft: '#A5F0FB', deep: '#0E7490' },
        accent: '#22D3EE',
        gold: '#FBBF24',
        // Neutrals
        background: '#F6F7F9',
        surface: '#FFFFFF',
        line: '#ECEEF2',
        ink: '#15171C',
        muted: '#5A616E',
        // Status
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#0EA5E9',
        // Dark scheme — TRUE near-black charcoal (not navy blue)
        dbg: '#0A0A0C',
        dsurface: '#141417',
        dcard: '#1B1B20',
        dline: '#2A2A31',
        dtext: '#F4F4F6',
        dmuted: '#A1A1AC',
      },
      fontFamily: {
        sans: ['var(--font-tajawal)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-lexend)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11, 11, 14, 0.05), 0 1px 2px rgba(11, 11, 14, 0.04)',
        lift: '0 8px 24px rgba(11, 11, 14, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
