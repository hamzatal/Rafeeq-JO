import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Route, Trip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function DriverTrips() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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

  useEffect(() => { void load(); }, [load]);

  const schedule = async (hour: number, dayOffset: number) => {
    if (!selectedRoute) { setMsg({ text: 'اختر مساراً أولاً', ok: false }); return; }
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    setMsg(null); setBusy(true);
    try {
      await api.driverTrips.schedule({ route_id: selectedRoute, scheduled_at: d.toISOString() });
      setMsg({ text: 'تم جدولة الرحلة', ok: true });
      setSelectedRoute(null);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل', ok: false });
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.h1}>رحلاتي</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        <View style={s.card}>
          <Text style={s.section}>جدولة رحلة جديدة</Text>
          <Text style={s.meta}>اختر المسار:</Text>
          <View style={s.chips}>
            {routes.length === 0 && <Text style={s.meta}>لا توجد مسارات بعد (تُضاف من الإدارة)</Text>}
            {routes.map((r) => (
              <Pressable key={r.id} onPress={() => setSelectedRoute(r.id)} style={[s.chip, selectedRoute === r.id && s.chipActive]}>
                <Text style={[s.chipText, selectedRoute === r.id && s.chipTextActive]}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
          {selectedRoute && (
            <View style={s.times}>
              <Pressable onPress={() => schedule(7, 1)} disabled={busy} style={s.timeBtn}><Text style={s.timeText}>غداً 7:00 ص</Text></Pressable>
              <Pressable onPress={() => schedule(16, 1)} disabled={busy} style={s.timeBtn}><Text style={s.timeText}>غداً 4:00 م</Text></Pressable>
            </View>
          )}
        </View>

        <Text style={s.section}>الرحلات</Text>
        {loading ? (
          <Text style={s.meta}>جارٍ التحميل...</Text>
        ) : trips.length === 0 ? (
          <Text style={s.meta}>لا توجد رحلات</Text>
        ) : (
          trips.map((tr) => (
            <Pressable key={tr.id} style={s.tripCard} onPress={() => router.push(`/(app)/trip/${tr.id}` as never)}>
              <View style={s.row}>
                <Text style={s.tripTitle}>{tr.route?.name ?? 'رحلة مجمّعة'}</Text>
                <Text style={s.badge}>{tr.status_label}</Text>
              </View>
              {tr.scheduled_at && <Text style={s.meta}>{new Date(tr.scheduled_at).toLocaleString('ar')}</Text>}
              <Text style={s.meta}>الركاب: {tr.booked_count ?? 0}/{tr.capacity}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.sm, marginBottom: t.spacing.sm },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.lg },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.full, paddingVertical: 6, paddingHorizontal: 14 },
    chipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipText: { fontFamily: t.fontFamily.medium, color: t.colors.text, fontSize: 13 },
    chipTextActive: { color: t.colors.onPrimary },
    times: { flexDirection: 'row-reverse', gap: 10, marginTop: t.spacing.md },
    timeBtn: { flex: 1, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10, alignItems: 'center' },
    timeText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },
    tripCard: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.md },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    tripTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    badge: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.primary },
  });
