/** 8px-baseline spacing scale + border radii + shadows (Stitch design system). */

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8, // baseline unit
  md: 12, // stack-sm
  base: 16, // gutter
  lg: 20, // container-padding-mobile
  xl: 24, // stack-md
  '2xl': 32,
  '3xl': 40,
  '4xl': 48, // stack-lg / container-padding-desktop
} as const;

// Stitch "Friendly Geometry": 16px on cards/buttons, 12px on inputs, 8px inner.
export const radius = {
  none: 0,
  sm: 8, // inner (nested elements)
  md: 12, // form inputs
  lg: 16, // PRIMARY — cards & main buttons
  xl: 24,
  '2xl': 28,
  full: 9999,
} as const;

// Ambient shadows — Stitch profile: large blur (20–30px), very low opacity
// (5–8%), tinted with the primary Deep Royal Blue so shadows read as a soft
// "lifted" depth rather than a heavy drop.
const NAVY_SHADOW = '#002045';
export const shadow = {
  sm: {
    shadowColor: NAVY_SHADOW,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  md: {
    shadowColor: NAVY_SHADOW,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  lg: {
    shadowColor: NAVY_SHADOW,
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
} as const;
