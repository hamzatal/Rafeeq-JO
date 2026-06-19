import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { palette } from '@rafeeq/shared';
import { MapBackdrop } from './MapBackdrop';

/**
 * Animated branded launch — Student.
 * New Jordan-inspired identity: gold "R" emblem with the seven-pointed star,
 * and a car driving along the road (replaces the old moving dot).
 */
export function BrandSplash() {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const drive = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.timing(drive, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ).start();
  }, [drive, opacity, scale, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const carX = drive.interpolate({ inputRange: [0, 1], outputRange: [-46, ROAD_WIDTH + 6] });
  const carBob = drive.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -1.5, 0, -1.5, 0] });

  return (
    <View style={styles.container}>
      {/* Jordan road-map backdrop */}
      <MapBackdrop roadColor="rgba(255,255,255,0.09)" routeColor={GOLD} nodeColor="rgba(255,255,255,0.30)" />

      {/* Soft vignette so the logo stays readable over the map */}
      <View style={styles.vignette} pointerEvents="none" />

      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <View style={styles.emblem}>
          <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
          <Text style={styles.glyph}>R</Text>
          <View style={styles.star} />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity }}>
        <Text style={styles.word}>رفيق</Text>
        <Text style={styles.tag}>النقل والخدمات الجامعية الذكية</Text>
      </Animated.View>

      {/* Road with a car driving along it */}
      <View style={styles.road}>
        <View style={styles.lane} />
        <Animated.View style={[styles.car, { transform: [{ translateX: carX }, { translateY: carBob }] }]}>
          <View style={styles.carCabin} />
          <View style={styles.carBody} />
          <View style={[styles.wheel, styles.wheelL]} />
          <View style={[styles.wheel, styles.wheelR]} />
        </Animated.View>
      </View>
    </View>
  );
}

const ROAD_WIDTH = 220;
const GOLD = palette.gold;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.primary, opacity: 0.35 },
  emblem: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  ring: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: GOLD, borderTopColor: 'transparent', borderRightColor: 'transparent' },
  glyph: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 62, fontWeight: '900', color: palette.primary },
  star: { position: 'absolute', top: 16, right: 22, width: 10, height: 10, borderRadius: 5, backgroundColor: '#CE1126' },
  word: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 40, color: '#FFFFFF', textAlign: 'center' },
  tag: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' },

  road: { width: ROAD_WIDTH, height: 30, marginTop: 40, justifyContent: 'flex-end' },
  lane: { position: 'absolute', bottom: 3, width: ROAD_WIDTH, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },

  car: { position: 'absolute', bottom: 6, width: 44, height: 24 },
  carBody: { position: 'absolute', bottom: 6, width: 44, height: 12, borderRadius: 5, backgroundColor: GOLD },
  carCabin: { position: 'absolute', bottom: 14, left: 9, width: 24, height: 11, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: GOLD },
  wheel: { position: 'absolute', bottom: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#0A0A0A', borderWidth: 2, borderColor: '#FFFFFF' },
  wheelL: { left: 6 },
  wheelR: { right: 6 },
});
