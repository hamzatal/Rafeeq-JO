import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
  style?: ViewStyle;
}

export function Button({ title, onPress, loading = false, disabled = false, variant = 'primary', style }: ButtonProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const isOutline = variant === 'outline';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        isOutline ? s.outline : s.primary,
        isDisabled && s.disabled,
        pressed && !isDisabled && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? theme.colors.primary : theme.colors.onPrimary} />
      ) : (
        <Text style={[s.label, isOutline ? s.outlineLabel : s.primaryLabel]}>{title}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    base: { height: 52, borderRadius: t.radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.spacing.lg },
    primary: { backgroundColor: t.colors.primary },
    outline: { borderWidth: 1.5, borderColor: t.colors.primary, backgroundColor: 'transparent' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    label: { fontFamily: t.fontFamily.bold, fontSize: 16 },
    primaryLabel: { color: t.colors.onPrimary },
    outlineLabel: { color: t.colors.primary },
  });
