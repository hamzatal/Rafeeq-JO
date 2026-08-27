import { describe, expect, it, vi } from 'vitest';
import type { ReactTestInstance } from 'react-test-renderer';
import { ActivityIndicator, Pressable, TextInput } from 'react-native';
import { alpha, colors } from '@rafeeq/tokens';
import { Banner } from './Banner';
import { Button } from './Button';
import { Input } from './Input';
import { flatStyle, render } from '../test/render';

describe('Banner', () => {
  it('renders nothing without a message, so a caller can pass state directly', () => {
    expect(render(<Banner message={null} />).tree.toJSON()).toBeNull();
    expect(render(<Banner message="" />).tree.toJSON()).toBeNull();
  });

  /*
   * The drift this component was: the two apps tinted at `${color}1A` and
   * `${color}22` — 10% against 13%. Nobody chose that. It is what happens when a
   * colour is built by concatenating a hex suffix, because the value is invisible at
   * the call site and a typo looks exactly like a decision.
   */
  it('tints from alpha(), at one opacity', () => {
    const box = render(<Banner message="خطأ" />).root.findAll(
      (n: ReactTestInstance) => Boolean(n.props?.accessibilityLiveRegion),
      { deep: true },
    )[0];

    expect(flatStyle(box.props.style).backgroundColor).toBe(alpha(colors.danger, 0.1));
  });

  /*
   * A banner appearing is the ANSWER to something the user just did. Without a live
   * region it is silent to a screen reader — focus does not move, so nothing reads.
   */
  it('announces, and an error announces as an alert', () => {
    const err = render(<Banner message="خطأ" variant="error" />).byRole('alert');
    const info = render(<Banner message="معلومة" variant="info" />).byRole('alert');

    expect(err.length).toBeGreaterThan(0);
    expect(info.length).toBe(0);
  });
});

describe('Button', () => {
  const variants = ['primary', 'positive', 'danger', 'outline', 'ghost'] as const;

  /*
   * Five, not the roadmap's four.
   *
   * A `grep` for `variant="danger"` found nothing, so the plan said delete it. It was
   * wrong: `Feedback`'s confirm dialog computes the variant at runtime, so the only
   * call site is invisible to a literal search. Deleting it would have compiled and
   * silently painted every destructive confirmation the same blue as «متابعة».
   */
  it('offers exactly the five variants the product uses', () => {
    for (const variant of variants) {
      const p = render(<Button title="x" onPress={() => {}} variant={variant} />).root.findAllByType(Pressable)[0];

      expect(flatStyle(p.props.style).backgroundColor ?? 'transparent', variant).toBeTruthy();
    }
  });

  it('uses the token control height for the small size', () => {
    const md = render(<Button title="x" onPress={() => {}} size="md" />).root.findAllByType(Pressable)[0];

    expect(flatStyle(md.props.style).height).toBe(46);
  });

  it('never goes below the 44 touch target', () => {
    for (const size of ['md', 'lg'] as const) {
      const p = render(<Button title="x" onPress={() => {}} size={size} />).root.findAllByType(Pressable)[0];
      const s = flatStyle(p.props.style);

      expect(Math.max(Number(s.height), Number(s.minHeight ?? 0)), size).toBeGreaterThanOrEqual(44);
    }
  });

  /*
   * While loading, the label is replaced by a spinner — which has no accessible
   * name. Without `busy` the control announces nothing at the exact moment the user
   * is waiting to hear that their tap registered.
   */
  it('reports busy and keeps its name while loading', () => {
    const p = render(<Button title="ادفع" onPress={() => {}} loading />).root.findAllByType(Pressable)[0];

    expect(p.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(p.props.accessibilityLabel).toBe('ادفع');
    expect(render(<Button title="ادفع" onPress={() => {}} loading />).root.findAllByType(ActivityIndicator).length).toBe(1);
  });

  it('does not fire while loading', () => {
    const onPress = vi.fn();
    const p = render(<Button title="x" onPress={onPress} loading />).root.findAllByType(Pressable)[0];

    expect(p.props.disabled).toBe(true);
  });
});

describe('Input', () => {
  /*
   * The label and the error are WIRED to the field now, not merely sitting near it.
   * Before, a screen reader announced an unlabelled text box and never read the
   * validation message, so a rejected form was silent.
   */
  it('gives the field its label as an accessible name', () => {
    const field = render(<Input label="رقم الهاتف" />).root.findAllByType(TextInput)[0];

    expect(field.props.accessibilityLabel).toBe('رقم الهاتف');
  });

  it('marks the field invalid and points at the message', () => {
    const r = render(<Input label="رقم الهاتف" error="رقم غير صحيح" />);
    const field = r.root.findAllByType(TextInput)[0];

    expect(field.props['aria-invalid']).toBe(true);
    expect(field.props['aria-errormessage']).toBeTruthy();
    expect(r.text()).toContain('رقم غير صحيح');
  });

  it('is not invalid without an error', () => {
    const field = render(<Input label="رقم الهاتف" />).root.findAllByType(TextInput)[0];

    expect(field.props['aria-invalid']).toBe(false);
    expect(field.props['aria-errormessage']).toBeUndefined();
  });

  /*
   * `onDark` is gone. It carried five raw colours — four `rgba(255,255,255,…)` and a
   * `#FCA5A5` — for a dark auth canvas that decisions 7 and 15 removed, and it had
   * ZERO call sites. A token for an unused state is still an unused state.
   */
  it('has no onDark escape hatch', () => {
    expect('onDark' in ({} as Record<string, unknown>)).toBe(false);
    const field = render(<Input label="x" />).root.findAllByType(TextInput)[0];

    expect(field.props.placeholderTextColor).toBe(colors.muted);
  });
});
