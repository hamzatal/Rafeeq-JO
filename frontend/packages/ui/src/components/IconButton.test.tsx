import { describe, expect, it, vi } from 'vitest';
import { Pressable } from 'react-native';
import { IconButton, LabelledPressable, TOUCH_TARGET } from './IconButton';
import { flatStyle, render } from '../test/render';

function pressableOf(element: React.ReactElement) {
  return render(element).root.findAllByType(Pressable)[0];
}

describe('IconButton', () => {
  /*
   * The whole reason this component exists.
   *
   * 28 pressables in the two apps had an icon as their only child and no label, and
   * `accessibilityLabel` appeared ZERO times in either app. A required prop means the
   * compiler asks — including at the call sites a JSX-shape regex cannot see, like an
   * icon behind a wrapper component.
   */
  it('announces as a button with the given name', () => {
    const p = pressableOf(<IconButton name="x" accessibilityLabel="إغلاق" onPress={() => {}} />);

    expect(p.props.accessibilityRole).toBe('button');
    expect(p.props.accessibilityLabel).toBe('إغلاق');
  });

  /*
   * WCAG 2.5.5 and approved decision 6. Most of these controls were sized to the
   * GLYPH — a 22px icon in a 22px box, half the required target.
   */
  it('is at least 44 in both dimensions', () => {
    const s = flatStyle(pressableOf(<IconButton name="x" accessibilityLabel="إغلاق" onPress={() => {}} />).props.style);

    expect(TOUCH_TARGET).toBeGreaterThanOrEqual(44);
    expect(s.minWidth).toBe(TOUCH_TARGET);
    expect(s.minHeight).toBe(TOUCH_TARGET);
  });

  /*
   * hitSlop ON TOP of the box, not instead of it. Slop grows the touch area but not
   * the visible one, and someone with a tremor has to be able to see where to aim.
   */
  it('keeps hitSlop as well as the visible target', () => {
    expect(pressableOf(<IconButton name="x" accessibilityLabel="إغلاق" onPress={() => {}} />).props.hitSlop).toBe(8);
  });

  it('reports disabled to the accessibility tree, not just visually', () => {
    const p = pressableOf(<IconButton name="x" accessibilityLabel="إغلاق" onPress={() => {}} disabled />);

    expect(p.props.accessibilityState).toEqual({ disabled: true });
    expect(p.props.disabled).toBe(true);
  });

  it('calls onPress', () => {
    const onPress = vi.fn();
    pressableOf(<IconButton name="x" accessibilityLabel="إغلاق" onPress={onPress} />).props.onPress();

    expect(onPress).toHaveBeenCalledOnce();
  });

  it('forwards an optional hint without inventing one', () => {
    const bare = pressableOf(<IconButton name="x" accessibilityLabel="إغلاق" onPress={() => {}} />);
    const hinted = pressableOf(
      <IconButton name="x" accessibilityLabel="إغلاق" accessibilityHint="يغلق النافذة" onPress={() => {}} />,
    );

    expect(bare.props.accessibilityHint).toBeUndefined();
    expect(hinted.props.accessibilityHint).toBe('يغلق النافذة');
  });
});

describe('LabelledPressable', () => {
  /* An avatar, a photo thumbnail, a map marker: no text child, so no name either. */
  it('labels a control that has no icon and no text', () => {
    const p = pressableOf(
      <LabelledPressable accessibilityLabel="الصورة الشخصية" onPress={() => {}}>
        {null}
      </LabelledPressable>,
    );

    expect(p.props.accessibilityRole).toBe('button');
    expect(p.props.accessibilityLabel).toBe('الصورة الشخصية');
  });
});
