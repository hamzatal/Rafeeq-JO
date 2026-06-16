import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { palette } from '@rafeeq/shared';

/** Animated branded launch screen — Student (blue, smart-services vibe). */
export function BrandSplash() {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const road = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(road, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [opacity, pulse, road, scale, slide]);

  const segX = road.interpolate({ inputRange: [0, 1], outputRange: [-70, 190] });

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale: Animated.multiply(scale, pulse) }] }}>
        <View style={styles.badge}>
          <View style={styles.pin}>
            <View style={styles.dot} />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity, transform: [{ translateY: slide }] }}>
        <Text style={styles.word}>رفيق</Text>
        <Text style={styles.tag}>النقل والخدمات الجامعية الذكية</Text>
      </Animated.View>

      {/* Animated "road" loader */}
      <View style={styles.road}>
        <Animated.View style={[styles.roadSeg, { transform: [{ translateX: segX }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  badge: { width: 112, height: 112, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  pin: { width: 58, height: 58, borderRadius: 29, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.navy },
  word: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 40, color: '#FFFFFF', textAlign: 'center' },
  tag: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' },
  road: { width: 180, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 36 },
  roadSeg: { width: 60, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
