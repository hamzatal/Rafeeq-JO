import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { TOUCH_TARGET } from './IconButton';

/* ═══════════════════════════════════════════════════════════════════════════
   BUTTON — four variants, because four is what the product uses.

   ── The six, measured ─────────────────────────────────────────────────────

     primary   32 screen call sites (all implicit — nobody passes it)
     ghost      5
     outline    1
     positive   1
     danger     1  — and it is DYNAMIC, which is why a literal search missed it
     accent     0  ← the only one deleted

   `accent` was `colors.accent`, which phase 6 resolved to the SAME hex as
   `primary`: decision 2 removed the secondary colour, so the two variants rendered
   identically. A variant indistinguishable from another is not a choice, it is a
   coin flip no reviewer can catch.

   ── Why this is five and not the roadmap's four ────────────────────────────

   The roadmap said reduce six to four, and a `grep` for `variant="danger"` agreed
   — zero hits. It was wrong. `Feedback.tsx` renders the confirm dialog with
   `variant={tone === 'danger' ? 'danger' : 'primary'}`, computed at runtime, so
   the only call site is invisible to a search for a literal. Deleting `danger`
   would have compiled and then silently painted every destructive confirmation
   the same blue as «متابعة».

   Five is the honest number. The lesson is the reason it is written down here:
   "unused" from a text search is not unused.
   ═══════════════════════════════════════════════════════════════════════════ */

type Variant = 'primary' | 'positive' | 'danger' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Extra context for a screen reader, e.g. «يفتح صفحة الدفع». */
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'lg',
  icon,
  accessibilityHint,
  style,
}: ButtonProps) {
  const t = useTheme();
  const s = makeStyles(t);
  const isDisabled = disabled || loading;

  const fill: Record<Variant, ViewStyle> = {
    primary: s.primary,
    positive: s.positive,
    danger: s.danger,
    outline: s.outline,
    ghost: s.ghost,
  };
  const labelColor: Record<Variant, string> = {
    primary: t.colors.onPrimary,
    positive: t.colors.textInverse,
    danger: t.colors.textInverse,
    outline: t.colors.primary,
    ghost: t.colors.text,
  };
  const color = labelColor[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      /*
       * `busy` so a screen reader says "in progress" instead of going silent.
       *
       * While loading the label is replaced by a spinner, which has no accessible
       * name — so without this the control announces nothing at the exact moment
       * the user is waiting to hear that their tap registered.
       */
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        s.base,
        size === 'md' && s.md,
        fill[variant],
        isDisabled && s.disabled,
        pressed && !isDisabled && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={s.row}>
          {icon ? <Icon name={icon} size={18} color={color} /> : null}
          <Text role="titleMd" align="center" style={{ color }} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    /*
     * 54 for the primary CTA, 46 for a secondary control.
     *
     * 46 is `size.control` — the height kit.css gives an input and a button, so a
     * `md` button lines up with the field beside it. 54 is decision 6's raised
     * target for a primary action, and it is above the 44 minimum by design, not
     * by accident.
     */
    base: {
      height: 54,
      minHeight: TOUCH_TARGET,
      borderRadius: t.radius.card,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.space.lg,
    },
    md: { height: t.size.control, borderRadius: t.radius.control },
    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    primary: { backgroundColor: t.colors.primary },
    positive: { backgroundColor: t.colors.success },
    danger: { backgroundColor: t.colors.danger },
    outline: { borderWidth: 1.5, borderColor: t.colors.primary, backgroundColor: 'transparent' },
    ghost: { backgroundColor: t.colors.hairline },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
