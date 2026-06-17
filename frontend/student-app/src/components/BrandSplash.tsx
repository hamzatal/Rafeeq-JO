import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { palette } from '@rafeeq/shared';

/** Animated branded launch — Student (new circular emblem, blue). */
export function BrandSplash() {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const road = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(road, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })).start();
  }, [opacity, road, scale, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const segX = road.interpolate({ inputRange: [0, 1], outputRange: [-70, 190] });

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <View style={styles.emblem}>
          <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
          <Text style={styles.glyph}>ر</Text>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity }}>
        <Text style={styles.word}>رفيق</Text>
        <Text style={styles.tag}>النقل والخدمات الجامعية الذكية</Text>
      </Animated.View>

      <View style={styles.road}>
        <Animated.View style={[styles.roadSeg, { transform: [{ translateX: segX }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  emblem: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  ring: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: palette.gold, borderTopColor: 'transparent', borderRightColor: 'transparent' },
  glyph: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 58, color: palette.primary, marginTop: -6 },
  word: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 40, color: '#FFFFFF', textAlign: 'center' },
  tag: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' },
  road: { width: 180, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 36 },
  roadSeg: { width: 60, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
