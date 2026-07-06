import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/**
 * Modern branded loader — three signature-blue dots pulsing in sequence.
 * Replaces plain "loading…" text / bare spinners with an on-brand, animated
 * indicator (color follows the theme accent).
 */
export function Loader({ size = 10, color, style }: { size?: number; color?: string; style?: ViewStyle }) {
  const theme = useTheme();
  const dotColor = color ?? theme.colors.accent;
  const dots = useMemo(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)], []);
  const anims = useRef(dots).current;

  useEffect(() => {
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
  }, [anims]);

  return (
    <View style={[styles.row, { gap: size * 0.7 }, style]}>
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

/** Full-screen centered branded loader with an optional label. */
export function LoaderScreen({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Loader size={12} />
      {label ? (
        <Text style={{ marginTop: 16, fontFamily: theme.fontFamily.medium, fontSize: 14, color: theme.colors.textSecondary }}>
          {label}
        </Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
