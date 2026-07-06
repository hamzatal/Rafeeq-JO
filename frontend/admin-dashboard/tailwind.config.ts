import type { Config } from 'tailwindcss';

/**
 * Admin Console — Design System v7 "Onyx" (ink + signature blue).
 * Ink = structural/brand chrome (sidebar, table headers, primary CTA). Blue =
 * the single interactive accent (active nav, links, highlights, info pills).
 * Deep-ink dark scheme matches the mobile apps exactly.
 *
 * NOTE (transitional aliases): the legacy `navy`, `gold` and `cyan` token names
 * are intentionally repointed to the Onyx ink + blue families so the many
 * existing `navy` / `gold-*` / `cyan-*` utility usages across pages render the
 * unified brand WITHOUT a mass class rename. Renaming the classes to
 * `ink-*` / `accent-*` is a cosmetic follow-up; the rendered brand is correct.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — ink primary (main CTA fill, carries white text)
        primary: { DEFAULT: '#0F1216', dark: '#000000', light: '#2A2F37' },
        // "navy" (legacy alias) = structural ink used for sidebar / table headers / dark chrome
        navy: { DEFAULT: '#12161D', light: '#171C24', deep: '#0A0D12', 900: '#0A0D12' },
        // Signature blue accent family
        blue: { DEFAULT: '#2F6BFF', soft: '#DCE7FF', deep: '#2454D8' },
        // Legacy aliases: gold-* / cyan-* → signature blue (see note above)
        gold: { DEFAULT: '#2F6BFF', soft: '#DCE7FF', deep: '#2454D8' },
        cyan: { DEFAULT: '#2F6BFF', soft: '#DCE7FF', deep: '#2454D8' },
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
        // Dark scheme — deep ink (matches mobile scheme.ts)
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
        card: '0 1px 3px rgba(15, 18, 22, 0.06), 0 1px 2px rgba(15, 18, 22, 0.04)',
        lift: '0 8px 24px rgba(15, 18, 22, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
