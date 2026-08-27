/* ═══════════════════════════════════════════════════════════════════════════
   TEXT — the only way to put type on screen.

   ── The problem this solves ────────────────────────────────────────────────

   `fontSize:` appeared 457 times across 21 distinct values in the two apps. Not
   twenty-one decisions — twenty-one accidents, each made at a call site by
   someone picking a number that looked right next to the number above it. The
   design system has TEN type roles, and `packages/tokens` has exposed them as
   `theme.type.titleMd` since phase 6, but nothing made using them easier than
   typing `fontSize: 17`.

   Worse, every one of those call sites also picked a `fontFamily`, so a heading
   could be `semibold` on one screen and `bold` on the next with the same size.
   Weight and size are not independent: they are one decision, and this component
   is where that decision lives.

   ── Why it is named `Text` ─────────────────────────────────────────────────

   Because the ESLint rule bans `Text` from `react-native`, and a banned import
   with an identically-named replacement is a one-line fix a developer makes
   without thinking. A differently-named one (`Txt`, `AppText`, `Type`) is a
   decision they have to make every time, and the path of least resistance goes
   back to the raw import.

   ── Escape hatch ──────────────────────────────────────────────────────────

   `style` still works, so a screen that genuinely needs something the scale does
   not have is not blocked — but it now shows up as an override on top of a role,
   which is reviewable, instead of a bare number that looks like a decision.
   ═══════════════════════════════════════════════════════════════════════════ */

import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import type { TypeRole } from '@rafeeq/tokens';
import { useTheme } from '../theme';

/** Semantic colour, so a screen does not reach for `theme.colors` for its type. */
export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

/*
 * `Omit<…, 'role'>` — this component's `role` is the TYPE role, not the ARIA one.
 *
 * React Native 0.74 added an ARIA `role` prop whose values are `'heading' | 'link'
 * | …`. Ours names a row in the type scale (`titleMd`, `caption`), which is the
 * term `kit.css` and `packages/tokens` have used since phase 6, so renaming it here
 * would leave the design system with two words for one thing.
 *
 * Nothing is lost: `accessibilityRole` is still forwarded and React Native maps it
 * to the same platform semantics the ARIA prop would have.
 */
export interface TextProps extends Omit<RNTextProps, 'role'> {
  /**
   * A role from the type scale. Defaults to `body`.
   *
   * Every role carries its own size, line height, letter spacing AND font face —
   * see `packages/tokens/src/type.ts`. Passing a role is what makes a heading on
   * the wallet screen the same heading as on the trip screen.
   */
  role?: TypeRole;
  tone?: TextTone;
  /**
   * Text alignment. Defaults to `right`, because the product is Arabic.
   *
   * This is the reason `textAlign: 'right'` appeared on almost every style
   * object in both apps: the RN default is `left`, so every single label had to
   * opt out of it. Inverting the default deletes ~300 of those.
   */
  align?: TextStyle['textAlign'];
  /** Centred single-line labels inside buttons and pills. */
  numberOfLines?: number;
}

export function Text({ role = 'body', tone = 'default', align = 'right', style, ...rest }: TextProps) {
  const t = useTheme();

  const color: Record<TextTone, string> = {
    default: t.colors.text,
    secondary: t.colors.textSecondary,
    muted: t.colors.muted,
    inverse: t.colors.textInverse,
    primary: t.colors.primary,
    success: t.colors.success,
    warning: t.colors.warning,
    danger: t.colors.danger,
  };

  return <RNText style={[t.type[role], { color: color[tone], textAlign: align }, style]} {...rest} />;
}

/**
 * `Text` with the raw react-native behaviour, for the two places that need it.
 *
 * `ErrorBoundary` renders when the theme may be the thing that failed, so it
 * cannot call `useTheme()`. Exported rather than left as a local import so the
 * ESLint rule stays absolute — one named exception beats a rule with a
 * `// eslint-disable` next to it, because the disable comment spreads by copy.
 */
export { RNText as UnstyledText };

export const textStyles = StyleSheet.create({
  /** Centres a label inside a control. */
  centered: { textAlign: 'center' },
});
