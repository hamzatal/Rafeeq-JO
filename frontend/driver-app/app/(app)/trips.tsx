import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Route, Trip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { api } from '../../src/lib/api';
import { theme } from '../../src/theme';

export default function DriverTrips() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([api.driverTrips.list(), api.catalog.listRoutes()]);
      setTrips(t);
      setRoutes(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const schedule = async (hour: number, dayOffset: number) => {
    if (!selectedRoute) {
      setMsg({ text: 'اختر مساراً أولاً', ok: false });
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);

    setMsg(null);
    setBusy(true);
    try {
      await api.driverTrips.schedule({ route_id: selectedRoute, scheduled_at: d.toISOString() });
      setMsg({ text: 'تم جدولة الرحلة', ok: true });
      setSelectedRoute(null);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل', ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>رحلاتي</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        <View style={styles.card}>
          <Text style={styles.section}>جدولة رحلة جديدة</Text>
          <Text style={styles.meta}>اختر المسار:</Text>
          <View style={styles.chips}>
            {routes.length === 0 && <Text style={styles.meta}>لا توجد مسارات بعد (تُضاف من الإدارة)</Text>}
            {routes.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setSelectedRoute(r.id)}
                style={[styles.chip, selectedRoute === r.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedRoute === r.id && styles.chipTextActive]}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
          {selectedRoute && (
            <View style={styles.times}>
              <Pressable onPress={() => schedule(7, 1)} disabled={busy} style={styles.timeBtn}>
                <Text style={styles.timeText}>غداً 7:00 ص</Text>
              </Pressable>
              <Pressable onPress={() => schedule(16, 1)} disabled={busy} style={styles.timeBtn}>
                <Text style={styles.timeText}>غداً 4:00 م</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.section}>الرحلات</Text>
        {loading ? (
          <Text style={styles.meta}>جارٍ التحميل...</Text>
        ) : trips.length === 0 ? (
          <Text style={styles.meta}>لا توجد رحلات</Text>
        ) : (
          trips.map((t) => (
            <Pressable key={t.id} style={styles.tripCard} onPress={() => router.push(`/(app)/trip/${t.id}` as never)}>
              <View style={styles.row}>
                <Text style={styles.tripTitle}>{t.route?.name ?? 'رحلة'}</Text>
                <Text style={styles.badge}>{t.status_label}</Text>
              </View>
              {t.scheduled_at && <Text style={styles.meta}>{new Date(t.scheduled_at).toLocaleString('ar')}</Text>}
              <Text style={styles.meta}>الركاب: {t.booked_count ?? 0}/{t.capacity}</Text>
            </Pressable>
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
  section: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text, textAlign: 'right', marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.base, marginBottom: theme.spacing.lg },
  meta: { fontFamily: theme.fontFamily.regular, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingVertical: 6, paddingHorizontal: 14 },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontFamily: theme.fontFamily.medium, color: theme.colors.text, fontSize: 13 },
  chipTextActive: { color: theme.colors.onPrimary },
  times: { flexDirection: 'row-reverse', gap: 10, marginTop: theme.spacing.md },
  timeBtn: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: 10, alignItems: 'center' },
  timeText: { color: theme.colors.onPrimary, fontFamily: theme.fontFamily.bold, fontSize: 13 },
  tripCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.base, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  tripTitle: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text },
  badge: { fontFamily: theme.fontFamily.medium, fontSize: 13, color: theme.colors.primary },
});
