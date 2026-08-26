import type { Config } from 'tailwindcss';

/**
 * Admin Console — «مسار» identity.
 *
 * ── What phase 4 removed, and why it was not cosmetic ─────────────────────────
 *
 * This file used to declare the RETIRED identity — navy `#002045` with a teal
 * `#006A65` accent — plus four alias families (`navy`, `gold`, `cyan`, `blue`)
 * all repointed at those same two colours, and six `d*` "dark aliases"
 * repointed at light neutrals so that leftover `dark:` utilities would not
 * visibly break.
 *
 * The comment above them called the aliases "transitional" and said the
 * rendered brand was "already correct". It was not: it rendered the brand that
 * decision 2 replaced. Every screen in this dashboard was navy-and-teal while
 * the design documents, store assets, README and marketing were all blue. The
 * aliases were what allowed that gap to persist — they made the wrong colour
 * reachable under four different names, so nobody had to look at it.
 *
 * So: one ramp, one name per colour, values copied from `docs/design/src/kit.css`
 * which is the source of truth. `gold` turned out to mean *warning* (medium
 * dispute severity, an alert border) and is now called that.
 *
 * The `d*` dark aliases are gone — they had reached zero usages once the 58
 * `dark:` utilities were removed, so nothing pointed at them at all.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * The brand ramp, kit.css --b50 … --b900. Exposed in full because the
         * dashboard genuinely needs tints (table headers, selected rows, badge
         * fills) and inventing them inline is how 117 hand-written hex values
         * got here in the first place.
         */
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#8EC1FD',
          400: '#5AA2FB',
          500: '#2E82F6',
          600: '#1259E3',
          700: '#0E47B4',
          800: '#0F3A8C',
          900: '#122F6B',
        },
        // Semantic aliases onto the ramp — what a thing IS, not what colour it is.
        primary: {
          DEFAULT: '#1259E3', // brand-600 — fills that carry white text
          dark: '#0E47B4', //    brand-700 — text on light, hover on a fill
          light: '#2E82F6', //   brand-500
          deep: '#0F3A8C', //    brand-800 — tooltips, deepest chrome
        },

        // Neutrals, kit.css --n0 … --n900
        background: '#F2F5F9', // n50
        surface: '#FFFFFF', //    n0
        hairline: '#E9EDF4', //   n100
        line: '#DDE3EC', //       n200
        muted: '#4E5872', //      n600
        ink: '#0E1524', //        n900

        // Status. Meaning only — never decoration.
        success: '#047857',
        warning: '#B45309',
        danger: '#D92D20',
        info: '#0E47B4', // the brand at low emphasis, not a fourth hue

        /*
         * The live amber — the one sanctioned second colour (decision 13). It
         * marks the destination dot in the mark and a trip happening RIGHT NOW.
         * Used for anything else it stops meaning "live".
         */
        live: { DEFAULT: '#F59E0B', soft: '#FEF3C7' },
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex)', 'system-ui', 'sans-serif'],
        display: ['var(--font-ibm-plex)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // kit.css --sh-md / --sh-lg, tinted with brand-900 rather than black.
        card: '0 4px 12px rgba(18,47,107,.08), 0 1px 3px rgba(18,47,107,.06)',
        lift: '0 12px 32px rgba(18,47,107,.12), 0 4px 8px rgba(18,47,107,.06)',
      },
    },
  },
  plugins: [],
};

export default config;
