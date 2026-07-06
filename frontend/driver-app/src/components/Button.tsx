import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';

/**
 * Button variants (Design System v7 — Onyx):
 *  - primary  → ink fill (the main CTA)                      [white label]
 *  - accent   → signature-blue fill (key action CTA)         [white label]
 *  - positive → green fill (accept / confirm / go)           [white label]
 *  - danger   → red fill (destructive: delete / reject)      [white label]
 *  - outline  → transparent, navy border                     [navy label]
 *  - ghost    → subtle neutral fill                          [text label]
 */
type Variant = 'primary' | 'accent' | 'positive' | 'danger' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'lg',
  icon,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const isDisabled = disabled || loading;

  const fill: Record<Variant, ViewStyle> = {
    primary: s.primary,
    accent: s.accent,
    positive: s.positive,
    danger: s.danger,
    outline: s.outline,
    ghost: s.ghost,
  };
  const labelColor: Record<Variant, string> = {
    primary: theme.colors.onPrimary,
    accent: theme.colors.onAccent,
    positive: theme.colors.textInverse,
    danger: theme.colors.textInverse,
    outline: theme.colors.primary,
    ghost: theme.colors.text,
  };
  const color = labelColor[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
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
          <Text style={[s.label, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    base: { height: 54, borderRadius: t.radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.spacing.lg },
    md: { height: 46, borderRadius: t.radius.md },
    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    primary: { backgroundColor: t.colors.primary },
    accent: { backgroundColor: t.colors.accent },
    positive: { backgroundColor: t.colors.success },
    danger: { backgroundColor: t.colors.danger },
    outline: { borderWidth: 1.5, borderColor: t.colors.primary, backgroundColor: 'transparent' },
    ghost: { backgroundColor: t.colors.hairline },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    label: { fontFamily: t.fontFamily.bold, fontSize: 16 },
  });
