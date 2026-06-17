import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme, type AppTheme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.wrapper}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.muted}
        style={[s.input, error ? s.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: t.spacing.base, width: '100%' },
    label: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text, marginBottom: t.spacing.xs, textAlign: 'right' },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      paddingHorizontal: t.spacing.base,
      fontFamily: t.fontFamily.regular,
      fontSize: 16,
      color: t.colors.text,
      backgroundColor: t.colors.surface,
      textAlign: 'right',
    },
    inputError: { borderColor: t.colors.danger },
    error: { color: t.colors.danger, fontSize: 12, marginTop: 4, fontFamily: t.fontFamily.regular, textAlign: 'right' },
  });
