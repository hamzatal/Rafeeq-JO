import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { palette } from '@rafeeq/shared';

const ROAD_WIDTH = 240;
const PIN = 26;

/** Animated branded launch screen — Driver (dark map/road theme). */
export function BrandSplash() {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(travel, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ).start();
  }, [fade, pulse, travel]);

  const pinX = travel.interpolate({ inputRange: [0, 1], outputRange: [4, ROAD_WIDTH - PIN - 4] });
  const pinLift = travel.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] });

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <View style={styles.badge}>
          <View style={styles.pin}>
            <View style={styles.dot} />
          </View>
        </View>
      </Animated.View>

      <Text style={styles.word}>رفيق</Text>
      <Text style={styles.tag}>كابتن</Text>

      {/* Animated road with a travelling marker */}
      <View style={styles.road}>
        <View style={styles.centerLine}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <Animated.View style={[styles.marker, { transform: [{ translateX: pinX }, { translateY: pinLift }] }]}>
          <View style={styles.markerInner} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy },
  badge: { width: 112, height: 112, borderRadius: 30, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  pin: { width: 58, height: 58, borderRadius: 29, backgroundColor: palette.navy, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.gold },
  word: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 40, color: '#FFFFFF' },
  tag: { fontFamily: 'Tajawal_700Bold', fontSize: 16, color: palette.gold, marginTop: 4, letterSpacing: 2 },
  road: { width: ROAD_WIDTH, height: 40, borderRadius: 8, backgroundColor: palette.navySurface, marginTop: 40, justifyContent: 'center', overflow: 'hidden' },
  centerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  dash: { width: 14, height: 4, borderRadius: 2, backgroundColor: 'rgba(212,160,23,0.5)' },
  marker: { position: 'absolute', top: 7, width: PIN, height: PIN, borderRadius: PIN / 2, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  markerInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.navy },
});
