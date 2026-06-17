import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', dark: '#1D4ED8' },
        gold: '#D4A017',
        navy: { DEFAULT: '#0F172A', light: '#1E293B' },
        background: '#F6F8FC',
        surface: '#FFFFFF',
        line: '#E2E8F0',
        muted: '#64748B',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#0EA5E9',
        // dark scheme
        dbg: '#0B1220',
        dsurface: '#131C2E',
        dcard: '#1B2840',
        dline: '#26344B',
        dtext: '#F1F5F9',
        dmuted: '#9FB0C7',
      },
      fontFamily: { sans: ['Tajawal', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;
