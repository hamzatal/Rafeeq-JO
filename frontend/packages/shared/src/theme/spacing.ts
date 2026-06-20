/** 4px-based spacing scale + border radii + shadows. */

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

export const radius = {
  none: 0,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

// Restrained, premium elevation — subtle, never heavy/"toy-like".
export const shadow = {
  sm: {
    shadowColor: '#0B0B0E',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0B0B0E',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B0B0E',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
} as const;
