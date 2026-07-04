import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Leading icon inside the field (formal look). */
  icon?: IconName;
  /** @deprecated kept for API compatibility — the field now adapts to the theme. */
  onDark?: boolean;
}

/**
 * Formal, structured input field (DS v7 "Onyx").
 * Filled surface + hairline border + soft elevation, an optional leading icon,
 * and a focus ring in the signature blue. Password fields get a show/hide eye.
 */
export function Input({ label, error, icon, style, onDark: _onDark, secureTextEntry, ...props }: InputProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={s.wrapper}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.field, focused && s.fieldFocused, error ? s.fieldError : null]}>
        {icon ? <Icon name={icon} size={18} color={focused ? theme.colors.accent : theme.colors.muted} /> : null}
        <TextInput
          placeholderTextColor={theme.colors.muted}
          style={[s.input, style]}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Icon name={hidden ? 'eye' : 'eye-off'} size={18} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: t.spacing.base, width: '100%' },
    label: { fontFamily: t.fontFamily.semibold, fontSize: 13.5, color: t.colors.textSecondary, marginBottom: 8, textAlign: 'right' },
    field: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      minHeight: 58,
      borderRadius: t.radius.xl,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingHorizontal: t.spacing.base,
      ...t.shadow.sm,
    },
    fieldFocused: { borderColor: t.colors.accent, borderWidth: 1.5 },
    fieldError: { borderColor: t.colors.danger },
    input: { flex: 1, fontFamily: t.fontFamily.semibold, fontSize: 16, color: t.colors.text, textAlign: 'right', paddingVertical: 16 },
    error: { color: t.colors.danger, fontSize: 12, marginTop: 5, fontFamily: t.fontFamily.regular, textAlign: 'right' },
  });
