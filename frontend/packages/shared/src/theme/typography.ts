/**
 * Typography scale. Font family: Tajawal (Arabic-first).
 * Weights available: 400, 500, 600, 700, 800.
 */

export const fontFamily = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
  extrabold: 'IBMPlexSansArabic_700Bold',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const typography = {
  h1: { fontFamily: fontFamily.extrabold, fontSize: fontSize['3xl'] },
  h2: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'] },
  h3: { fontFamily: fontFamily.bold, fontSize: fontSize.xl },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.base },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  button: { fontFamily: fontFamily.bold, fontSize: fontSize.base },
} as const;
