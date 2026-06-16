import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { palette } from '@rafeeq/shared';

/** Branded launch screen for the driver app (dark Navy + gold). */
export function BrandSplash() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <View style={styles.pin}>
          <View style={styles.dot} />
        </View>
      </View>
      <Text style={styles.word}>رفيق</Text>
      <Text style={styles.tag}>كابتن</Text>
      <ActivityIndicator color={palette.gold} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy },
  badge: {
    width: 112,
    height: 112,
    borderRadius: 30,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pin: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.gold },
  word: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 40, color: '#FFFFFF' },
  tag: { fontFamily: 'Tajawal_700Bold', fontSize: 16, color: palette.gold, marginTop: 4, letterSpacing: 2 },
  spinner: { marginTop: 28 },
});
