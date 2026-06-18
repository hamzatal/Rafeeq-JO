import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0B7A43', dark: '#075C32' },
        gold: '#E6B23E',
        navy: { DEFAULT: '#0E261C', light: '#163524' },
        background: '#F4F7F5',
        surface: '#FFFFFF',
        line: '#E4EAE6',
        muted: '#516159',
        success: '#16A34A',
        warning: '#E0930C',
        danger: '#CE1126',
        info: '#0EA5E9',
        // dark scheme (deep green)
        dbg: '#08130D',
        dsurface: '#0F2017',
        dcard: '#142A1E',
        dline: '#214034',
        dtext: '#ECF4EF',
        dmuted: '#9FB3A8',
      },
      fontFamily: { sans: ['Tajawal', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;
