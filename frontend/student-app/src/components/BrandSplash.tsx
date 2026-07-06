import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { palette, fontFamily } from '@rafeeq/shared';

/**
 * Branded launch — Student. Calm, premium identity over the Amman map:
 * a glowing emblem with a slow orbit ring, the wordmark, and a soft
 * three-dot loader (replaces the old driving-car animation).
 */
export function BrandSplash() {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <ImageBackground source={require('../../assets/splash-map.jpg')} style={styles.container} resizeMode="cover">
      <View style={styles.scrim} pointerEvents="none" />

      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <View style={styles.emblemWrap}>
          <Animated.View style={[styles.glow, { opacity: glow, transform: [{ scale: glowScale }] }]} />
          <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
          <View style={styles.emblem}>
            <Image source={require('../../assets/r-logo.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
        </View>

        <Text style={styles.word}>رفيق</Text>
        <Text style={styles.tag}>النقل والخدمات الجامعية الذكية</Text>

        <View style={styles.dots}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.25] }) }] }]}
            />
          ))}
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const ACCENT = palette.accentBright;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.ink, opacity: 0.5 },
  emblemWrap: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  glow: { position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: ACCENT },
  ring: { position: 'absolute', width: 122, height: 122, borderRadius: 61, borderWidth: 2.5, borderColor: ACCENT, borderTopColor: 'transparent', borderRightColor: 'transparent' },
  emblem: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  logoImg: { width: 66, height: 66 },
  word: { fontFamily: fontFamily.extrabold, fontSize: 38, color: '#FFFFFF', textAlign: 'center', letterSpacing: 1 },
  tag: { fontFamily: fontFamily.medium, fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 6, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 28 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: ACCENT },
});
