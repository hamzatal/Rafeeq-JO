import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';

/**
 * Branded launch — Onyx over the Amman map. A premium first impression:
 * the city map darkened under a deep-ink scrim, a floating white emblem with a
 * pulsing signature-blue aura, the wordmark + tagline, and a slim progress bar.
 * Self-contained (renders even if the theme provider is what failed to load).
 */

const INK = '#0A0D12';
const BLUE = '#2F6BFF';
const BLUE_SOFT = 'rgba(47,107,255,0.30)';

export function BrandSplash() {
  const rise = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const aura = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rise, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(aura, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(aura, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.timing(bar, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const auraOpacity = aura.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.78] });
  const auraScale = aura.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const barWidth = bar.interpolate({ inputRange: [0, 1], outputRange: ['8%', '92%'] });
  const barX = bar.interpolate({ inputRange: [0, 1], outputRange: [-40, 220] });

  return (
    <ImageBackground source={require('../../assets/splash-map.jpg')} style={styles.container} resizeMode="cover">
      {/* Deep-ink scrim (darker than before → more premium) + bottom fade */}
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.scrimBottom} pointerEvents="none" />

      <Animated.View style={{ opacity: rise, transform: [{ translateY }], alignItems: 'center' }}>
        <View style={styles.emblemWrap}>
          <Animated.View style={[styles.aura, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
          <Animated.View style={[styles.emblem, { transform: [{ scale }] }]}>
            <Image source={require('../../assets/r-logo.png')} style={styles.logoImg} resizeMode="contain" />
          </Animated.View>
        </View>

        <Text style={styles.word}>رفيق</Text>
        <Text style={styles.sub}>Rafeeq</Text>
        <Text style={styles.tag}>النقل والخدمات الجامعية الذكية</Text>
      </Animated.View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth, transform: [{ translateX: barX }] }]} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: INK },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: INK, opacity: 0.82 },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', backgroundColor: INK, opacity: 0.4 },

  emblemWrap: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  aura: { position: 'absolute', width: 148, height: 148, borderRadius: 74, backgroundColor: BLUE_SOFT },
  emblem: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  logoImg: { width: 66, height: 66 },

  word: { fontFamily: 'Cairo_800ExtraBold', fontSize: 40, color: '#FFFFFF', letterSpacing: 0.5 },
  sub: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: BLUE, letterSpacing: 4, marginTop: 2 },
  tag: { fontFamily: 'Cairo_500Medium', fontSize: 13.5, color: 'rgba(255,255,255,0.65)', marginTop: 12, textAlign: 'center' },

  track: { position: 'absolute', bottom: 70, width: 200, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: BLUE },
});
