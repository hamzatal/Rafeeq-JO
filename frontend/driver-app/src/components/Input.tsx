import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme, type AppTheme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Style the field for a dark background (auth hero screens). */
  onDark?: boolean;
}

export function Input({ label, error, style, onDark = false, ...props }: InputProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.wrapper}>
      {label ? <Text style={[s.label, onDark && s.labelDark]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={onDark ? 'rgba(255,255,255,0.45)' : theme.colors.muted}
        style={[s.input, onDark && s.inputDark, error ? s.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={[s.error, onDark && s.errorDark]}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: t.spacing.base, width: '100%' },
    label: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.text, marginBottom: 7, textAlign: 'right' },
    labelDark: { color: 'rgba(255,255,255,0.85)' },
    input: {
      height: 56,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.xl,
      paddingHorizontal: t.spacing.base,
      fontFamily: t.fontFamily.medium,
      fontSize: 16,
      color: t.colors.text,
      backgroundColor: t.colors.surface,
      textAlign: 'right',
    },
    inputDark: {
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderColor: 'rgba(255,255,255,0.16)',
      color: '#FFFFFF',
    },
    inputError: { borderColor: t.colors.danger },
    error: { color: t.colors.danger, fontSize: 12, marginTop: 4, fontFamily: t.fontFamily.regular, textAlign: 'right' },
    errorDark: { color: '#FCA5A5' },
  });
