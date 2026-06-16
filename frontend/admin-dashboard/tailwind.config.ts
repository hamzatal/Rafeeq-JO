import type { Config } from 'tailwindcss';

// Rafeeq brand palette (kept in sync with @rafeeq/shared theme).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', dark: '#1D4ED8' },
        gold: '#D4A017',
        navy: { DEFAULT: '#0F172A', light: '#1E293B' },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        line: '#E2E8F0',
        muted: '#64748B',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#0EA5E9',
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
