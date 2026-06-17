import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '../theme';

type Variant = 'error' | 'success' | 'info' | 'warning';

interface BannerProps {
  message?: string | null;
  variant?: Variant;
}

export function Banner({ message, variant = 'error' }: BannerProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  if (!message) return null;

  const color = {
    error: theme.colors.danger,
    success: theme.colors.success,
    info: theme.colors.info,
    warning: theme.colors.warning,
  }[variant];

  return (
    <View style={[s.box, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[s.text, { color }]}>{message}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    box: { borderWidth: 1, borderRadius: t.radius.md, paddingVertical: t.spacing.sm, paddingHorizontal: t.spacing.base, marginBottom: t.spacing.base },
    text: { fontFamily: t.fontFamily.medium, fontSize: 14, textAlign: 'right' },
  });
