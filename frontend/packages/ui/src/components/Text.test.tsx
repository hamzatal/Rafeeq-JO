import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Text as RNText } from 'react-native';
import { type as typeScale, fontFamily, colors } from '@rafeeq/tokens';
import { Text } from './Text';
import { first, flatStyle, render } from '../test/render';

/**
 * The style our `Text` HANDED to react-native's, before the platform touches it.
 *
 * Not the rendered host node: under the `react-native-web` alias that node is a
 * `<div>` whose `fontSize` has already become the string `"40px"`. Asserting there
 * would test the web adapter's unit conversion, which is not ours, and would break
 * the moment the alias changed.
 */
function styleOf(element: ReactElement) {
  return flatStyle(first(render(element).root.findAllByType(RNText), 'Text').props.style);
}

describe('Text', () => {
  /*
   * The reason this component exists.
   *
   * `fontSize:` was written 457 times across 21 distinct values in the two apps,
   * because nothing made using the scale easier than typing a number. A role has to
   * resolve to the SCALE, not to something close to it, or the component is just a
   * different way to guess.
   */
  it('resolves a role to the token scale, size AND face together', () => {
    for (const role of Object.keys(typeScale) as (keyof typeof typeScale)[]) {
      const s = styleOf(<Text role={role}>x</Text>);

      expect(s.fontSize, `${role} size`).toBe(typeScale[role].size);
      expect(s.lineHeight, `${role} leading`).toBe(typeScale[role].lineHeight);
      expect(s.fontFamily, `${role} face`).toBe(fontFamily[typeScale[role].weight]);
    }
  });

  it('defaults to body', () => {
    expect(styleOf(<Text>x</Text>).fontSize).toBe(typeScale.body.size);
  });

  /*
   * The product is Arabic, and React Native's default is `left`. That default is why
   * `textAlign: 'right'` appeared on almost every style object in both apps — every
   * single label had to opt out of it.
   */
  it('aligns right by default', () => {
    expect(styleOf(<Text>x</Text>).textAlign).toBe('right');
    expect(styleOf(<Text align="center">x</Text>).textAlign).toBe('center');
  });

  it('maps every tone to a semantic colour, never a literal', () => {
    const expected = {
      default: colors.text,
      secondary: colors.textSecondary,
      muted: colors.muted,
      inverse: colors.textInverse,
      primary: colors.primary,
      success: colors.success,
      warning: colors.warning,
      danger: colors.danger,
    } as const;

    for (const [tone, hex] of Object.entries(expected)) {
      expect(styleOf(<Text tone={tone as keyof typeof expected}>x</Text>).color, tone).toBe(hex);
    }
  });

  /* A screen that genuinely needs something off-scale must still be able to say so. */
  it('lets an explicit style win, so the escape hatch is real', () => {
    expect(styleOf(<Text role="caption" style={{ fontSize: 40 }}>x</Text>).fontSize).toBe(40);
  });

  it('forwards accessibilityRole, since ARIA `role` is deliberately shadowed', () => {
    const r = render(
      <Text role="titleLg" accessibilityRole="header">
        عنوان
      </Text>,
    );

    expect(r.byRole('header').length).toBeGreaterThan(0);
  });
});
