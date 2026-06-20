import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
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
    danger: s.danger,
    outline: s.outline,
    ghost: s.ghost,
  };
  const labelColor =
    variant === 'outline'
      ? theme.colors.primary
      : variant === 'ghost'
        ? theme.colors.text
        : theme.colors.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
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
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={s.row}>
          {icon ? <Icon name={icon} size={18} color={labelColor} /> : null}
          <Text style={[s.label, { color: labelColor }]}>{title}</Text>
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
    danger: { backgroundColor: t.colors.danger },
    outline: { borderWidth: 1.5, borderColor: t.colors.primary, backgroundColor: 'transparent' },
    ghost: { backgroundColor: t.colors.hairline },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    label: { fontFamily: t.fontFamily.bold, fontSize: 16 },
  });
