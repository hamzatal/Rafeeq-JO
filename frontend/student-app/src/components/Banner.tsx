import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Variant = 'error' | 'success' | 'info';

interface BannerProps {
  message?: string | null;
  variant?: Variant;
}

/** Cross-platform inline message (Alert.alert is unreliable on web). */
export function Banner({ message, variant = 'error' }: BannerProps) {
  if (!message) return null;

  const color = {
    error: theme.colors.danger,
    success: theme.colors.success,
    info: theme.colors.info,
  }[variant];

  return (
    <View style={[styles.box, { borderColor: color, backgroundColor: `${color}14` }]}>
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
  text: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 14,
    textAlign: 'right',
  },
});
