import { driverTheme, spacing, radius, typography, fontFamily } from '@rafeeq/shared';

/** The driver app uses the dark Navy + gold theme. */
export const theme = {
  colors: {
    ...driverTheme,
    // label color to place on top of the gold primary button
    onPrimary: '#0F172A',
  },
  spacing,
  radius,
  typography,
  fontFamily,
};

export type Theme = typeof theme;
