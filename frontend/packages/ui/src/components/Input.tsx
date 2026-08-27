import { useId } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

/**
 * A labelled text field.
 *
 * ── `onDark` is gone ──────────────────────────────────────────────────────
 *
 * The prop existed to style the field for a dark auth canvas, and it carried five
 * raw colours: `rgba(255,255,255,0.45)`, `rgba(255,255,255,0.85)`,
 * `rgba(255,255,255,0.07)`, `rgba(255,255,255,0.16)` and `#FCA5A5`.
 *
 * It was used **zero** times. Approved decision 7 deleted dark mode and decision
 * 15 made the student splash light; `AuthShell`'s own comment says LIGHT-MODE
 * ONLY. So the prop was carrying five off-system colours through the design-token
 * gate on behalf of a canvas that no longer exists. Deleted rather than migrated
 * to tokens — a token for an unused state is still an unused state.
 *
 * ── Accessibility ─────────────────────────────────────────────────────────
 *
 * The label and the error are now WIRED to the field rather than merely sitting
 * next to it. Before, a screen reader announced an unlabelled text box and never
 * read the validation message at all, so a rejected form was silent.
 */
export function Input({ label, error, style, ...props }: InputProps) {
  const t = useTheme();
  const s = makeStyles(t);
  const errorId = useId();

  return (
    <View style={s.wrapper}>
      {label ? (
        <Text role="label" style={s.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={t.colors.muted}
        style={[s.input, error ? s.inputError : null, style]}
        accessibilityLabel={label}
        /* Announces "invalid" and reads the message, instead of a silent red border. */
        aria-invalid={Boolean(error)}
        aria-errormessage={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <Text role="caption" tone="danger" nativeID={errorId} accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: t.space.base, width: '100%' },
    label: { marginBottom: 7 },
    input: {
      height: 54,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.card,
      paddingHorizontal: t.space.base,
      fontFamily: t.fontFamily.medium,
      fontSize: t.type.bodyLg.fontSize,
      color: t.colors.text,
      backgroundColor: t.colors.surface,
      textAlign: 'right',
    },
    inputError: { borderColor: t.colors.danger },
    error: { marginTop: 4 },
  });
