import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { palette } from '@rafeeq/shared';

const ROAD_WIDTH = 240;

/**
 * Animated branded launch — Driver (dark).
 * New Jordan-inspired identity: gold "R" emblem with the seven-pointed star,
 * and a car driving along the road (replaces the old moving pin).
 */
export function BrandSplash() {
  const fade = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const drive = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(drive, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })).start();
  }, [drive, fade, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const carX = drive.interpolate({ inputRange: [0, 1], outputRange: [6, ROAD_WIDTH - 50] });
  const carBob = drive.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -1.5, 0, -1.5, 0] });

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <View style={styles.emblem}>
        <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
        <Text style={styles.glyph}>R</Text>
        <View style={styles.star} />
      </View>

      <Text style={styles.word}>رفيق</Text>
      <Text style={styles.tag}>كابتن</Text>

      <View style={styles.road}>
        <View style={styles.centerLine}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <Animated.View style={[styles.car, { transform: [{ translateX: carX }, { translateY: carBob }] }]}>
          <View style={styles.carCabin} />
          <View style={styles.carBody} />
          <View style={[styles.wheel, styles.wheelL]} />
          <View style={[styles.wheel, styles.wheelR]} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const GOLD = palette.gold;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy },
  emblem: { width: 120, height: 120, borderRadius: 60, backgroundColor: palette.navySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  ring: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: GOLD, borderTopColor: 'transparent', borderRightColor: 'transparent' },
  glyph: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 60, fontWeight: '900', color: GOLD },
  star: { position: 'absolute', top: 16, right: 22, width: 10, height: 10, borderRadius: 5, backgroundColor: '#CE1126' },
  word: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 40, color: '#FFFFFF' },
  tag: { fontFamily: 'Tajawal_700Bold', fontSize: 16, color: GOLD, marginTop: 4, letterSpacing: 2 },

  road: { width: ROAD_WIDTH, height: 44, borderRadius: 8, backgroundColor: palette.navySurface, marginTop: 40, justifyContent: 'center', overflow: 'hidden' },
  centerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  dash: { width: 14, height: 4, borderRadius: 2, backgroundColor: 'rgba(212,160,23,0.5)' },

  car: { position: 'absolute', bottom: 8, width: 44, height: 24 },
  carBody: { position: 'absolute', bottom: 6, width: 44, height: 12, borderRadius: 5, backgroundColor: GOLD },
  carCabin: { position: 'absolute', bottom: 14, left: 9, width: 24, height: 11, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: GOLD },
  wheel: { position: 'absolute', bottom: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#0A0A0A', borderWidth: 2, borderColor: palette.navySurface },
  wheelL: { left: 6 },
  wheelR: { right: 6 },
});
