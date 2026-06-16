import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { palette } from '@rafeeq/shared';

/** Branded launch screen (Rafeeq logo mark + wordmark). */
export function BrandSplash() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <View style={styles.pin}>
          <View style={styles.dot} />
        </View>
      </View>
      <Text style={styles.word}>رفيق</Text>
      <Text style={styles.tag}>النقل والخدمات الجامعية الذكية</Text>
      <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  badge: {
    width: 112,
    height: 112,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pin: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.navy },
  word: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 40, color: '#FFFFFF' },
  tag: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  spinner: { marginTop: 28 },
});
