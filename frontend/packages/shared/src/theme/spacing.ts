/** 4px-based spacing scale + border radii + shadows (DS v7 "Onyx"). */

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
} as const;

// Softer, larger radii — modern, "pill & rounded-card" language.
export const radius = {
  none: 0,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 9999,
} as const;

// Real, layered elevation — soft and expensive, never hard/"toy-like".
// Uses cool-ink shadow color so shadows read as depth, not dirt.
export const shadow = {
  sm: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  lg: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
} as const;
