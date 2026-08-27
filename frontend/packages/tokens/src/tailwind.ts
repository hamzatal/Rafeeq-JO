/* ═══════════════════════════════════════════════════════════════════════════
   Tailwind preset — consumed by admin-dashboard/tailwind.config.ts.

   The dashboard used to hand-copy the ramp into its own config, which is how it
   ended up with radii and control heights that disagreed with kit.css and with
   the two apps. It now spreads this preset and adds nothing but `content`.
   ═══════════════════════════════════════════════════════════════════════════ */

import { brand, live, neutral, status } from './color';
import { colors } from './semantic';
import { boxShadow, radius, size, space } from './space';
import { fontStackList, fontWeight, type } from './type';

const px = (n: number) => `${n}px`;

/*
 * Deliberately NOT `as const`.
 *
 * Tailwind's `Config['theme']` expects mutable properties, so a deeply readonly
 * object fails to assign with a wall of `readonly` mismatches that says nothing
 * about the actual problem.
 */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        // Spread to strip `as const`'s readonly modifiers — Tailwind's Config type
        // wants mutable properties and rejects a deeply frozen object with an error
        // that names none of the actual problem.
        brand: { ...brand },
        neutral: { ...neutral },

        /*
         * `light` is brand 500, and it is load-bearing — `globals.css` uses
         * `hover:bg-primary-light` on `.btn-primary`, so dropping it does not
         * degrade a colour, it breaks the Tailwind build outright with "the class
         * does not exist". Worth noting as the failure mode of a token rename: the
         * web fails loudly at build, where React Native would have silently
         * rendered `undefined` as transparent.
         */
        primary: {
          DEFAULT: colors.primary,
          light: brand[500],
          dark: colors.primaryDark,
          deep: colors.primaryContainer,
          soft: colors.primarySoft,
        },

        background: colors.background,
        surface: colors.surface,
        'surface-alt': colors.surfaceAlt,
        hairline: colors.hairline,
        line: colors.border,
        ink: colors.text,
        muted: colors.textSecondary,

        success: { DEFAULT: status.success, soft: status.successSoft },
        warning: { DEFAULT: status.warning, soft: status.warningSoft },
        danger: { DEFAULT: status.danger, soft: status.dangerSoft },
        info: { DEFAULT: colors.info, soft: colors.infoSoft },

        live: { DEFAULT: live.base, soft: live.soft },
      },

      /*
       * The CSS VARIABLE comes first, not the family name.
       *
       * `next/font/google` self-hosts the font under a hashed family
       * (`__IBM_Plex_Sans_Arabic_abc123`) and exposes it only through the variable it
       * is asked to define — here `--font-ibm-plex`, set on `<html>` in
       * `app/layout.tsx`. Nothing in the dashboard declares an `@font-face` for the
       * literal name `'IBM Plex Sans Arabic'`.
       *
       * So building this list out of `fontStack` alone silently dropped every
       * `font-display` site — `.page-title`, `.stat-number`, the sidebar brand — down
       * to `system-ui`, while `font-sans` kept working through the `<body>` class and
       * hid it. `mono` already had the variable, which is what made the omission look
       * deliberate.
       *
       * `fontStack` is still the SECOND entry: it is what `kit.css` self-hosts under,
       * so a page that loads the mockup stylesheet instead of the Next.js font loader
       * resolves to the same outlines.
       */
      fontFamily: {
        sans: ['var(--font-ibm-plex)', ...fontStackList],
        display: ['var(--font-ibm-plex)', ...fontStackList],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      /*
       * Named by role, same as the RN scale, so a web heading and an app heading
       * are the same size by construction rather than by coincidence.
       *
       * The explicit tuple type matters: `Object.fromEntries` over an array
       * literal widens `[string, object]` to `(string | object)[]`, and Tailwind's
       * `fontSize` requires the TUPLE form. Without the annotation this fails with
       * an error that mentions `ResolvableTo<KeyValuePair<…>>` and never mentions
       * the array.
       */
      fontSize: Object.fromEntries(
        Object.entries(type).map(([role, t]): [string, [string, { lineHeight: string; letterSpacing: string }]] => [
          role,
          [px(t.size), { lineHeight: px(t.lineHeight), letterSpacing: `${t.letterSpacing}px` }],
        ]),
      ),

      fontWeight,

      borderRadius: {
        control: px(radius.control),
        card: px(radius.card),
        sheet: px(radius.sheet),
      },

      spacing: Object.fromEntries(Object.entries(space).map(([k, v]) => [k, px(v)])),

      height: { control: px(size.control), tab: px(size.tabBar) },

      boxShadow,
    },
  },
};

export default tailwindPreset;
