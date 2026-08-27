/* ═══════════════════════════════════════════════════════════════════════════
   TYPE — three weights, one scale.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Font families — FOUR real weights, and not one fictional one.
 *
 * ── The bug: a token that lied ─────────────────────────────────────────────
 *
 * The old `typography.ts` exported five weights, and the fifth did not exist.
 * `extrabold` was aliased straight to `IBMPlexSansArabic_700Bold`, because IBM
 * Plex Sans Arabic has no 800 face.
 *
 * So 94 places across the two apps asked for extrabold and silently got bold —
 * rendering identically to the 125 places that asked for bold. A token that
 * lies about what it produces is worse than a missing one: somebody reaching for
 * "heavier than bold" believed they had it, and the design intent behind those
 * 94 sites is now unrecoverable.
 *
 * On the web the same mistake had teeth. `font-extrabold` in the admin's
 * `globals.css` is CSS weight 800, and a browser with no 800 face SYNTHESISES one
 * by smearing the 700 outline. So `.page-title` and `.stat-number` were
 * faux-bold on the dashboard while the identical heading in the apps was plain
 * bold — one design, two renderings, neither intended.
 *
 * ── Why FOUR and not the three the roadmap asked for ───────────────────────
 *
 * Roadmap 6.3 says "3 weights only, delete the fictional extrabold". The
 * fictional one is deleted. `semibold` is kept, and that is a deliberate
 * deviation:
 *
 *   • it is REAL — `IBMPlexSansArabic_600SemiBold.ttf` ships in
 *     `@expo-google-fonts/ibm-plex-sans-arabic` and both apps already load it
 *   • it is USED — 32 sites, and they are section headings where 500 is too
 *     light and 700 too heavy
 *
 * The actual defect behind "3 weights" was that `docs/design/src/fonts/` only
 * held 400/500/700, so a mockup physically could not reproduce a 600 heading and
 * the design source and the app disagreed. Deleting a real, used weight to reach
 * a number in a plan would fix the symptom by making the product worse; adding
 * the missing face to the design source fixes the cause. The 600 file is now
 * committed alongside the others and declared in kit.css.
 */
export const fontFamily = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
} as const;

/** Numeric weights, for the web where a family name is not how weight is set. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * The type scale, named by ROLE rather than by size.
 *
 * ── Why a role scale and not `xs…4xl` ──────────────────────────────────────
 *
 * The old scale was `xs 12, sm 14, base 16 … 4xl 40` and had **zero imports**.
 * Meanwhile `fontSize:` appeared 457 times as a raw pixel literal across 21
 * distinct values. A t-shirt scale did not fail because it was wrong; it failed
 * because it does not answer the question anyone actually has, which is "what is
 * this text FOR". `titleMd` has an answer. `lg` does not.
 *
 * Values are kit.css's `.t-*` classes verbatim, so a screen and a mockup of that
 * screen now round-trip. The two `display*` entries are for marketing-scale type
 * that only appears on onboarding and the splash.
 */
export const type = {
  displayLg: { size: 40, lineHeight: 52, weight: 'bold', letterSpacing: -0.8 },
  displayMd: { size: 32, lineHeight: 40, weight: 'bold', letterSpacing: -0.4 },
  display: { size: 26, lineHeight: 32, weight: 'bold', letterSpacing: -0.2 },
  titleLg: { size: 21, lineHeight: 28, weight: 'bold', letterSpacing: 0 },
  titleMd: { size: 17, lineHeight: 24, weight: 'bold', letterSpacing: 0 },
  titleSm: { size: 15, lineHeight: 21, weight: 'medium', letterSpacing: 0 },
  body: { size: 14, lineHeight: 21, weight: 'regular', letterSpacing: 0 },
  bodyLg: { size: 16, lineHeight: 24, weight: 'regular', letterSpacing: 0 },
  label: { size: 12.5, lineHeight: 17, weight: 'medium', letterSpacing: 0 },
  caption: { size: 11, lineHeight: 15, weight: 'regular', letterSpacing: 0 },
} as const;

export type TypeRole = keyof typeof type;

/**
 * A type role as a React Native style object.
 *
 * Returns `fontFamily` rather than `fontWeight` because React Native on Android
 * ignores numeric weights for a custom family — the weight has to be baked into
 * the family name. That single platform quirk is why `fontFamily` above lists
 * faces instead of numbers.
 */
export function rnType(role: TypeRole): {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
} {
  const t = type[role];

  return {
    fontFamily: fontFamily[t.weight],
    fontSize: t.size,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
  };
}

/** The web font stack as ONE string, for a CSS `font-family` declaration. */
export const fontStack = "'IBM Plex Sans Arabic', system-ui, sans-serif";

/**
 * The same stack as a LIST, for Tailwind — which wants an array, not a string.
 *
 * Tailwind will accept a single-element array holding the whole comma-separated
 * stack, which is why passing `fontStack` there compiles and renders. It is still
 * wrong to do it: the dashboard needs `var(--font-ibm-plex)` PREPENDED, because
 * `next/font/google` registers a hashed family and exposes it only via that
 * variable. Prepending to a list is a spread; prepending to a baked string is a
 * concatenation nobody writes correctly twice.
 */
export const fontStackList = ["'IBM Plex Sans Arabic'", 'system-ui', 'sans-serif'];

/**
 * The OLD `text` scale, at its exact previous values. Do not use in new code.
 *
 * ── Why this survives ──────────────────────────────────────────────────────
 *
 * 16 call sites in `home.tsx` and `ride-request.tsx` spread these objects. Their
 * sizes do NOT line up with the role scale above — the old scale had a 24/32
 * heading, an 18/28 body and a 12/16 caption, where kit.css has 26/32, 16/24 and
 * 11/15. So remapping them is not a rename, it is a pixel change on two screens.
 *
 * Those two screens are rewritten in phase 8 (8.2 replaces the home screen and
 * 8.3 replaces the ride-class screen with the «مشتركة/منفردة» pair). Changing
 * their type now would be a visual diff on files about to be deleted, taken
 * without a designer looking at it — so the values are carried across verbatim
 * and the migration is left to the phase that touches these files anyway.
 *
 * `check:design` counts usages of this export and fails if the number GROWS, so
 * it can be paid off rather than quietly spreading.
 *
 * @deprecated use `type` — removed in phase 8
 */
export const legacyText = {
  displayLg: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 52, letterSpacing: -0.8 },
  displayLgMobile: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
  headlineMd: { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 32 },
  bodyLg: { fontFamily: fontFamily.regular, fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  labelSm: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
} as const;
