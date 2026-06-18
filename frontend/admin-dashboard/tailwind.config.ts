import type { Config } from 'tailwindcss';

/**
 * Rafeeq JO — Enterprise Command Center theme.
 * Deep Navy (#001F3F) + Vibrant Cyan (#00E5FF) on a light neutral canvas,
 * mirroring the Stitch "Rafeeq JO Enterprise / Command Center" design system.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — navy primary, cyan accent
        primary: { DEFAULT: '#001F3F', dark: '#00152B', light: '#0B2F57' },
        navy: { DEFAULT: '#001F3F', light: '#0B2F57', deep: '#00152B', 900: '#000D1C' },
        cyan: { DEFAULT: '#00E5FF', soft: '#9CF0FF', deep: '#006875' },
        accent: '#00E5FF',
        gold: '#E6B23E',
        // Neutrals
        background: '#F4F7FB',
        surface: '#FFFFFF',
        line: '#E2E8F0',
        ink: '#0B192C',
        muted: '#5A6B7B',
        // Status
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#0EA5E9',
        // Dark scheme (deep navy)
        dbg: '#00111F',
        dsurface: '#0A1F38',
        dcard: '#0E2747',
        dline: '#1E3A5F',
        dtext: '#E6EEF7',
        dmuted: '#90A4BC',
      },
      fontFamily: {
        sans: ['var(--font-tajawal)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-lexend)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11, 25, 44, 0.06), 0 1px 2px rgba(11, 25, 44, 0.04)',
        lift: '0 8px 24px rgba(11, 25, 44, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
