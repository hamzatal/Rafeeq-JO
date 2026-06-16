import { studentTheme, spacing, radius, typography, fontFamily } from '@rafeeq/shared';

/** The student app uses the light blue + gold theme. */
export const theme = {
  colors: studentTheme,
  spacing,
  radius,
  typography,
  fontFamily,
};

export type Theme = typeof theme;
