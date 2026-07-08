import type { Config } from 'tailwindcss';

/**
 * Admin Console — Design System "Stitch" (Deep Royal Blue + Smart Teal).
 * Navy = structural/brand chrome (sidebar, table headers, primary CTA, carries
 * white text). Teal = the single interactive accent (active nav, links,
 * highlights, info pills, AI/live states). Light-mode only.
 *
 * NOTE (transitional aliases): the legacy `navy`, `gold`, `cyan` and `blue`
 * token names are intentionally repointed to the Stitch navy + teal families so
 * the many existing utility usages across pages render the correct brand
 * WITHOUT a mass class rename. Renaming classes to `primary-*` / `accent-*` is
 * a cosmetic follow-up; the rendered brand is already correct.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — deep royal blue primary (main CTA fill, carries white text)
        primary: { DEFAULT: '#002045', dark: '#001B3C', light: '#1A365D' },
        // "navy" (alias) = structural navy used for sidebar / table headers / chrome
        navy: { DEFAULT: '#002045', light: '#1A365D', deep: '#001B3C', 900: '#001B3C' },
        // Smart teal accent family
        teal: { DEFAULT: '#006A65', soft: '#6FF7EE', deep: '#00504C' },
        // Legacy aliases: gold-* / cyan-* / blue-* → smart teal (see note above)
        gold: { DEFAULT: '#006A65', soft: '#6FF7EE', deep: '#00504C' },
        cyan: { DEFAULT: '#006A65', soft: '#6FF7EE', deep: '#00504C' },
        blue: { DEFAULT: '#006A65', soft: '#6FF7EE', deep: '#00504C' },
        accent: '#006A65',
        // Neutrals (off-white canvas + white cards)
        background: '#F9F9FF',
        surface: '#FFFFFF',
        line: '#C4C6CF',
        hairline: '#E7EEFF',
        ink: '#111C2C',
        muted: '#43474E',
        // Status (meaning only — success/info use teal per Stitch)
        success: '#006A65',
        warning: '#F79009',
        danger: '#BA1A1A',
        info: '#006A65',
        // Legacy dark aliases (light-only design) — repointed to light neutrals
        // so any residual `dark:*` utilities render on-brand instead of breaking.
        dbg: '#F9F9FF',
        dsurface: '#FFFFFF',
        dcard: '#FFFFFF',
        dline: '#C4C6CF',
        dtext: '#111C2C',
        dmuted: '#43474E',
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex)', 'system-ui', 'sans-serif'],
        display: ['var(--font-ibm-plex)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Ambient navy-tinted shadows (soft "lifted" depth)
        card: '0 4px 12px rgba(0, 32, 69, 0.05), 0 1px 2px rgba(0, 32, 69, 0.04)',
        lift: '0 16px 30px rgba(0, 32, 69, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
