import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Variant = 'error' | 'success' | 'info' | 'warning';

interface BannerProps {
  message?: string | null;
  variant?: Variant;
}

export function Banner({ message, variant = 'error' }: BannerProps) {
  if (!message) return null;

  const color = {
    error: theme.colors.danger,
    success: theme.colors.success,
    info: theme.colors.info,
    warning: theme.colors.warning,
  }[variant];

  return (
    <View style={[styles.box, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  text: { fontFamily: theme.fontFamily.medium, fontSize: 14, textAlign: 'right' },
});
