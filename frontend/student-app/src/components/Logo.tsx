import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

const MARK = require('../../assets/r-logo.png');

/**
 * Rafeeq brand logo — the single, shared identity across the three apps.
 * `mark` renders just the teal "R" glyph; `full`/`stacked` add the wordmark.
 * Colors follow the Stitch system (navy wordmark, teal accent handled by the
 * mark artwork itself).
 */
export function Logo({
  size = 40,
  variant = 'mark',
  tagline = false,
}: {
  size?: number;
  variant?: 'mark' | 'full' | 'stacked';
  tagline?: boolean;
}) {
  const t = useTheme();

  const mark = <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />;
  if (variant === 'mark') return mark;

  const wordmark = (
    <View style={variant === 'stacked' ? { alignItems: 'center' } : undefined}>
      <Text style={{ fontFamily: t.fontFamily.extrabold, fontSize: size * 0.62, color: t.colors.primary, lineHeight: size * 0.74 }}>
        رفيق
      </Text>
      {tagline ? (
        <Text style={{ fontFamily: t.fontFamily.medium, fontSize: size * 0.24, color: t.colors.textSecondary, marginTop: 2 }}>
          النقل والخدمات الجامعية الذكية
        </Text>
      ) : null}
    </View>
  );

  if (variant === 'stacked') {
    return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        {mark}
        {wordmark}
      </View>
    );
  }
  return (
    <View style={styles.row}>
      {mark}
      {wordmark}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
});
