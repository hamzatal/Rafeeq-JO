import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { api } from '../../src/lib/api';
import { theme } from '../../src/theme';

export default function Trips() {
  const [mine, setMine] = useState<TripPassenger[]>([]);
  const [available, setAvailable] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [location, setLocation] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([api.transport.myTrips(), api.transport.availableTrips()]);
      setMine(m);
      setAvailable(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const book = async (tripId: string) => {
    setMsg(null);
    setBusy(tripId);
    try {
      await api.transport.bookTrip(tripId);
      setMsg({ text: 'تم الحجز! احتفظ بكود الصعود.', ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل الحجز', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const track = async (tripId: string) => {
    try {
      const loc = await api.transport.tripLocation(tripId);
      setLocation((p) => ({
        ...p,
        [tripId]: loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : 'لا يوجد موقع بعد',
      }));
    } catch {
      setLocation((p) => ({ ...p, [tripId]: 'تعذّر جلب الموقع' }));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>رحلاتي</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {mine.length === 0 ? (
          <Text style={styles.meta}>لا يوجد حجوزات بعد</Text>
        ) : (
          mine.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{p.trip?.route?.name ?? 'رحلة'}</Text>
                <Text style={styles.badge}>{p.status_label}</Text>
              </View>
              {p.trip?.scheduled_at && (
                <Text style={styles.meta}>{new Date(p.trip.scheduled_at).toLocaleString('ar')}</Text>
              )}
              {p.boarding_code && (
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>كود الصعود</Text>
                  <Text style={styles.code}>{p.boarding_code}</Text>
                </View>
              )}
              <Pressable onPress={() => p.trip && track(p.trip_id)} style={styles.trackBtn}>
                <Text style={styles.trackText}>تتبّع الكابتن</Text>
              </Pressable>
              {location[p.trip_id] && <Text style={styles.meta}>📍 {location[p.trip_id]}</Text>}
            </View>
          ))
        )}

        <Text style={styles.section}>رحلات متاحة</Text>
        {loading ? (
          <Text style={styles.meta}>جارٍ التحميل...</Text>
        ) : available.length === 0 ? (
          <Text style={styles.meta}>لا توجد رحلات مجدولة حالياً</Text>
        ) : (
          available.map((t) => (
            <View key={t.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{t.route?.name ?? 'رحلة'}</Text>
                <Text style={styles.meta}>{t.booked_count ?? 0}/{t.capacity}</Text>
              </View>
              {t.scheduled_at && <Text style={styles.meta}>{new Date(t.scheduled_at).toLocaleString('ar')}</Text>}
              <Pressable onPress={() => book(t.id)} disabled={busy === t.id} style={styles.bookBtn}>
                <Text style={styles.bookText}>{busy === t.id ? '...' : 'احجز مقعد'}</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  h1: { fontFamily: theme.fontFamily.extrabold, fontSize: 22, color: theme.colors.text, textAlign: 'right', marginBottom: theme.spacing.base },
  section: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text, textAlign: 'right', marginTop: theme.spacing.base, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.base, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text },
  badge: { fontFamily: theme.fontFamily.medium, fontSize: 13, color: theme.colors.primary },
  meta: { fontFamily: theme.fontFamily.regular, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  codeBox: { backgroundColor: theme.colors.primary + '12', borderRadius: theme.radius.md, padding: theme.spacing.sm, marginTop: theme.spacing.sm, alignItems: 'center' },
  codeLabel: { fontFamily: theme.fontFamily.medium, fontSize: 12, color: theme.colors.textSecondary },
  code: { fontFamily: theme.fontFamily.extrabold, fontSize: 28, letterSpacing: 6, color: theme.colors.primary },
  trackBtn: { marginTop: theme.spacing.sm, alignSelf: 'flex-end' },
  trackText: { fontFamily: theme.fontFamily.medium, color: theme.colors.primary, fontSize: 14 },
  bookBtn: { marginTop: theme.spacing.sm, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: 10, alignItems: 'center' },
  bookText: { color: '#fff', fontFamily: theme.fontFamily.bold, fontSize: 14 },
});
