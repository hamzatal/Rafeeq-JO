import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.spacing.base, width: '100%' },
  label: {
    fontFamily: theme.fontFamily.medium,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'right',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.base,
    fontFamily: theme.fontFamily.regular,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    textAlign: 'right',
  },
  inputError: { borderColor: theme.colors.danger },
  error: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 4,
    fontFamily: theme.fontFamily.regular,
    textAlign: 'right',
  },
});
