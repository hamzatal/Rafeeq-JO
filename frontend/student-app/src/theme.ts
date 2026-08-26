import {
  buildTheme,
  fontFamily,
  radius,
  shadow,
  spacing,
  typography,
  type ThemeColors,
} from '@rafeeq/shared';

export interface AppTheme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
}

/*
 * One palette, built once.
 *
 * This used to be a hook that rebuilt on every colour-scheme change, reading a
 * `scheme` value from the prefs store. Dark mode is gone (decision 7), so the
 * dependency, the `useMemo` and the `scheme` field on AppTheme all went with it —
 * the object is now a module constant and `useTheme()` is a plain accessor, which
 * also removes a re-render source from every screen in the app.
 */
const theme: AppTheme = {
  colors: buildTheme('student'),
  spacing,
  radius,
  shadow,
  typography,
  fontFamily,
};

export function useTheme(): AppTheme {
  return theme;
}

/** For non-React usage (StyleSheet at module scope). */
export const staticColors = theme.colors;
