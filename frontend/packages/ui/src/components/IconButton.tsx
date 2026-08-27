/* ═══════════════════════════════════════════════════════════════════════════
   ICON BUTTON — a control whose label cannot be forgotten.

   ── The measurement ───────────────────────────────────────────────────────

   32 pressables in the two apps had an icon as their ONLY child, and 2 more in
   the dashboard. `accessibilityLabel` appeared **zero** times in either app.
   `accessibilityRole` appeared exactly twice — both inside `Button.tsx`, which
   has a text label anyway and therefore needed it least.

   A pressable whose only child is an SVG has no accessible name. To VoiceOver and
   TalkBack it announces as "button" and nothing else: the close button on every
   modal, the back arrow on every header, the camera button on the document
   upload, the SOS control. A blind student cannot use this product.

   ── Why a component and not a lint rule ───────────────────────────────────

   A lint rule for "a Pressable containing only an Icon must have
   accessibilityLabel" is possible, but it is a heuristic over JSX shape and it
   fails on the wrapper cases — an icon behind one layer of `<View>`, or an icon
   passed as a prop. Here the label is a REQUIRED prop, so the compiler enforces
   it on every call site including the ones a regex cannot see, and there is no
   `// eslint-disable` to reach for.

   The gate in `check-a11y.mjs` still exists, but it checks the thing that is
   actually hard to see: an icon-only pressable that did NOT come through here.

   ── Touch target ──────────────────────────────────────────────────────────

   44 minimum, per approved decision 6 — which is also the iOS HIG and the WCAG
   2.5.5 target size. A 22px glyph inside a 44px box means most of these were
   HALF the required size before, because the box was sized to the icon.
   ═══════════════════════════════════════════════════════════════════════════ */

import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { alpha } from '@rafeeq/tokens';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';

/** The minimum touch target, per decision 6. Never make this smaller. */
export const TOUCH_TARGET = 44;

export interface IconButtonProps {
  name: IconName;
  /**
   * What this control DOES, spoken aloud. Required, and that is the point.
   *
   * Write the action, not the glyph: «إغلاق» not «حرف إكس». A screen-reader user
   * hears this instead of seeing the icon, so it has to carry the same meaning
   * the icon carries for a sighted user.
   */
  accessibilityLabel: string;
  onPress: () => void;
  size?: number;
  color?: string;
  /** A filled circular background, for a control that sits on a map or a photo. */
  surface?: 'none' | 'soft' | 'solid' | 'scrim';
  disabled?: boolean;
  /** Extra context beyond the label, e.g. «يفتح قائمة الإعدادات». */
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  name,
  accessibilityLabel,
  onPress,
  size = 22,
  color,
  surface = 'none',
  disabled = false,
  accessibilityHint,
  style,
}: IconButtonProps) {
  const t = useTheme();
  const s = makeStyles(t);

  const tint =
    color ??
    (surface === 'solid' ? t.colors.onPrimary : surface === 'scrim' ? t.colors.textInverse : t.colors.text);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      /*
       * `hitSlop` on top of the 44pt box, not instead of it.
       *
       * hitSlop grows the touch area but NOT the visual target, and WCAG 2.5.5 is
       * about the visible control — someone with a tremor has to be able to see
       * where to aim. The slop is for the last few pixels.
       */
      hitSlop={8}
      style={({ pressed }) => [
        s.base,
        surface === 'soft' && s.soft,
        surface === 'solid' && s.solid,
        surface === 'scrim' && s.scrim,
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
    >
      <Icon name={name} size={size} color={tint} />
    </Pressable>
  );
}

/**
 * A pressable that is not an icon button but still has no visible text.
 *
 * An avatar, a map marker, a photo thumbnail, a colour swatch. Same requirement,
 * same reason: no text child means no accessible name. Kept separate from
 * `IconButton` so the icon case stays the obvious one.
 */
export interface PressableIconlessProps {
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LabelledPressable({
  accessibilityLabel,
  onPress,
  children,
  accessibilityHint,
  disabled = false,
  style,
}: PressableIconlessProps) {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [pressed && !disabled && s.pressed, disabled && s.disabled, style]}
    >
      <View style={s.minTarget}>{children}</View>
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    base: {
      minWidth: TOUCH_TARGET,
      minHeight: TOUCH_TARGET,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    minTarget: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
    soft: { backgroundColor: t.colors.primarySoft },
    solid: { backgroundColor: t.colors.primary },
    /* On a map tile or a photo, where neither a light nor a dark tint is legible. */
    scrim: { backgroundColor: alpha(t.colors.text, 0.55) },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.7 },
  });
