import { StyleSheet, View } from 'react-native';
import { alpha } from '@rafeeq/tokens';
import { useTheme, type AppTheme } from '../theme';
import { Text } from './Text';

type Variant = 'error' | 'success' | 'info' | 'warning';

interface BannerProps {
  message?: string | null;
  variant?: Variant;
}

/**
 * An inline message above a form or a list.
 *
 * ── The drift this file was ────────────────────────────────────────────────
 *
 * The two apps' copies differed by exactly one character: the tint was
 * `` `${color}1A` `` in the student app and `` `${color}22` `` in the captain's —
 * 10% opacity against 13%. Nobody chose that. It is what happens when a colour is
 * built by string-concatenating a hex suffix: the value is invisible at the call
 * site, so a typo and a decision look identical.
 *
 * `alpha()` from `@rafeeq/tokens` takes a number, which is both readable and the
 * reason the two cannot drift again.
 */
export function Banner({ message, variant = 'error' }: BannerProps) {
  const t = useTheme();
  const s = makeStyles(t);
  if (!message) return null;

  const color = {
    error: t.colors.danger,
    success: t.colors.success,
    info: t.colors.info,
    warning: t.colors.warning,
  }[variant];

  return (
    /*
     * `accessibilityLiveRegion="polite"` — a banner appearing is the ANSWER to
     * something the user just did (a failed login, a saved form). Without it the
     * message is silent to a screen reader: focus does not move, so nothing reads,
     * and the user is left waiting for a response that already arrived.
     */
    <View
      style={[s.box, { borderColor: color, backgroundColor: alpha(color, 0.1) }]}
      accessibilityLiveRegion="polite"
      accessibilityRole={variant === 'error' ? 'alert' : undefined}
    >
      <Text role="body" style={{ color }}>
        {message}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    box: {
      borderWidth: 1,
      borderRadius: t.radius.control,
      paddingVertical: t.space.sm,
      paddingHorizontal: t.space.base,
      marginBottom: t.space.base,
    },
  });
