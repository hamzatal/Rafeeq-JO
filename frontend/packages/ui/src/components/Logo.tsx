import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

const MARK = require('../../assets/r-logo.png');

/**
 * The Rafeeq mark and wordmark.
 *
 * ── Why the tagline is a prop ─────────────────────────────────────────────
 *
 * The two copies of this file differed by one string: «النقل والخدمات الجامعية
 * الذكية» for the student, «شريك النقل الذكي» for the captain. That is a real
 * difference — a captain is not a customer of campus transport, he provides it —
 * so it becomes an argument instead of a reason to keep two files.
 *
 * The old doc comment described «the teal "R" glyph» and a «navy wordmark». Both
 * colours belong to the identity retired in phase 4; the mark is brand blue and
 * the artwork carries its own colour. Prose is not gated by `check:design`, so a
 * comment can keep describing a brand that no longer exists — which is how a
 * reader learns the wrong system.
 */
export function Logo({
  size = 40,
  variant = 'mark',
  tagline,
  wordmark = 'رفيق',
}: {
  size?: number;
  variant?: 'mark' | 'full' | 'stacked';
  /** Pass the app's own tagline; omit for none. */
  tagline?: string;
  wordmark?: string;
}) {
  const t = useTheme();

  const mark = (
    <Image
      source={MARK}
      style={{ width: size, height: size }}
      resizeMode="contain"
      /*
       * Decorative when a wordmark follows, labelled when it stands alone —
       * otherwise a screen reader announces nothing at all for a bare logo.
       */
      accessibilityRole="image"
      accessibilityLabel={variant === 'mark' ? wordmark : undefined}
      accessibilityElementsHidden={variant !== 'mark'}
      importantForAccessibility={variant === 'mark' ? 'yes' : 'no'}
    />
  );

  if (variant === 'mark') return mark;

  const word = (
    <View style={variant === 'stacked' ? styles.centered : undefined}>
      <Text
        role="displayMd"
        tone="primary"
        align={variant === 'stacked' ? 'center' : 'right'}
        style={{ fontSize: size * 0.62, lineHeight: size * 0.74 }}
      >
        {wordmark}
      </Text>
      {tagline ? (
        <Text
          role="label"
          tone="secondary"
          align={variant === 'stacked' ? 'center' : 'right'}
          style={{ fontSize: size * 0.24, marginTop: 2 }}
        >
          {tagline}
        </Text>
      ) : null}
    </View>
  );

  if (variant === 'stacked') {
    return (
      <View style={[styles.centered, { gap: t.space.sm }]}>
        {mark}
        {word}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {mark}
      {word}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  centered: { alignItems: 'center' },
});
