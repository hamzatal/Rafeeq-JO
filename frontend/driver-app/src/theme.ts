import { useMemo } from 'react';
import {
  buildTheme,
  fontFamily,
  radius,
  shadow,
  spacing,
  typography,
  type ThemeColors,
} from '@rafeeq/shared';
import { usePrefs } from './store/prefs';

export interface AppTheme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  scheme: 'light' | 'dark';
}

/** Reactive theme hook for the driver app (role = driver, gold accent). */
export function useTheme(): AppTheme {
  const scheme = usePrefs((s) => s.scheme);
  const colors = useMemo(() => buildTheme('driver', scheme), [scheme]);
  return { colors, spacing, radius, shadow, typography, fontFamily, scheme };
}

export const staticColors = buildTheme('driver', 'light');
