/**
 * Typography scale — Stitch design system.
 * Font family: IBM Plex Sans Arabic (clean, technical, official, RTL-first).
 * Available weights: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold.
 * (IBM Plex Sans Arabic has no 800 weight — `extrabold` maps to 700 Bold.)
 */

export const fontFamily = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
  // No 800 weight in IBM Plex Sans Arabic — fall back to Bold for the heaviest.
  extrabold: 'IBMPlexSansArabic_700Bold',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '700',
} as const;

// Modular scale aligned with the Stitch DESIGN.md tokens.
export const fontSize = {
  xs: 12, // caption
  sm: 14, // label-sm
  base: 16, // body-md
  lg: 18, // body-lg
  xl: 20,
  '2xl': 24, // headline-md
  '3xl': 32, // display-lg (mobile)
  '4xl': 40, // display-lg (desktop)
} as const;

export const lineHeight = {
  tight: 1.25,
  normal: 1.5, // generous — accommodates Arabic ascenders/descenders
  relaxed: 1.75,
} as const;

/**
 * EXACT Stitch text styles (Material-3 type scale from the design source).
 * Each includes fontSize + lineHeight (absolute px) + letterSpacing (px) so
 * screens render pixel-identically to the Stitch mockups. letterSpacing is
 * converted from em: -0.02em·40 = -0.8px, 0.01em·14 = 0.14px.
 */
export const text = {
  displayLg: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 52, letterSpacing: -0.8 },
  displayLgMobile: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
  headlineMd: { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 32 },
  bodyLg: { fontFamily: fontFamily.regular, fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  labelSm: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
} as const;

export const typography = {
  // display-lg (mobile 32 / desktop 40) — welcome/hero headers, weight 700
  h1: { fontFamily: fontFamily.bold, fontSize: fontSize['3xl'] },
  // headline-md 24 / 600
  h2: { fontFamily: fontFamily.semibold, fontSize: fontSize['2xl'] },
  h3: { fontFamily: fontFamily.semibold, fontSize: fontSize.xl },
  // body-lg 18 (section titles)
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg },
  // body-md 16 / 400
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.base },
  // label-sm 14 / 500 (buttons, interactive labels)
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  button: { fontFamily: fontFamily.medium, fontSize: fontSize.base },
} as const;
