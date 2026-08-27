/*
 * Re-export, so a component in this package imports the theme from one place.
 *
 * `@rafeeq/tokens` is the source. This file exists because ~30 components were
 * moved here from two apps and every one of them said `from '../theme'`; keeping
 * the specifier stable made the move a file copy instead of a rewrite, which is
 * what let the diff be reviewed as "these files moved" rather than "these files
 * changed".
 */
export { rnTheme as theme, staticColors, useTheme } from '@rafeeq/tokens';
export type { AppTheme } from '@rafeeq/tokens';
