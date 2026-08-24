import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { palette, fontFamily } from '@rafeeq/shared';

/**
 * Branded launch — Captain. Pixel-faithful to Stitch `_1`: a deep navy canvas
 * with a soft teal center glow, a translucent rounded logo tile, the wordmark,
 * the slogan, and a three-dot loader.
 */
export function BrandSplash() {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    dots.forEach((d, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 420, useNativeDriver: true }),
          Animated.delay((2 - i) * 180),
        ]),
      ).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { opacity: glow, transform: [{ scale: glowScale }] }]} pointerEvents="none" />

      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <View style={styles.emblem}>
          <Image source={require('../../assets/r-logo.png')} style={styles.logoImg} resizeMode="contain" />
        </View>

        <Text style={styles.word}>رفيق</Text>
        <Text style={styles.tag}>رفيقك في كل خطوة جامعية</Text>

        <View style={styles.dots}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.25] }) }] }]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const ACCENT = palette.accentBright;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy },
  glow: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: ACCENT, opacity: 0.4 },
  emblem: { width: 96, height: 96, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoImg: { width: 56, height: 56 },
  word: { fontFamily: fontFamily.extrabold, fontSize: 32, lineHeight: 40, color: '#FFFFFF', textAlign: 'center', letterSpacing: 1 },
  tag: { fontFamily: fontFamily.regular, fontSize: 18, lineHeight: 28, color: '#ADC7F7', marginTop: 12, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 40 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
});
