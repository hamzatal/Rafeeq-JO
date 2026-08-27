import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useReduceMotion } from '../motion';
import { Text } from './Text';

/**
 * Three brand dots pulsing in sequence. The product's only spinner.
 *
 * ── It runs forever, which is why Reduce Motion matters here ───────────────
 *
 * An `Animated.loop` with no end is exactly the case the OS setting exists for.
 * Thirteen files in the two apps ran loops and `AccessibilityInfo` appeared in
 * none of them, so the switch did nothing. When motion is reduced the dots settle
 * at full opacity: still clearly a loading indicator, just not a moving one.
 */
export function Loader({ size = 10, color, style }: { size?: number; color?: string; style?: ViewStyle }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const dotColor = color ?? theme.colors.accent;
  const anims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    if (reduceMotion) {
      anims.forEach((v) => v.setValue(1));

      return;
    }

    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());

    return () => loops.forEach((l) => l.stop());
  }, [anims, reduceMotion]);

  return (
    <View
      style={[styles.row, { gap: size * 0.7 }, style]}
      /* One "busy" node, not three animated dots, for a screen reader. */
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      {anims.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: dotColor,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }],
          }}
        />
      ))}
    </View>
  );
}

/** Full-screen centred loader with an optional label. */
export function LoaderScreen({ label }: { label?: string }) {
  const theme = useTheme();
  const s = useMemo(
    () => StyleSheet.create({ screen: { ...styles.screen, backgroundColor: theme.colors.background } }),
    [theme],
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']} accessibilityLiveRegion="polite">
      <Loader size={12} />
      {label ? (
        <Text role="body" tone="secondary" align="center" style={styles.label}>
          {label}
        </Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16 },
});
