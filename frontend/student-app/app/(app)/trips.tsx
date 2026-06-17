import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Trips() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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

  useEffect(() => { void load(); }, [load]);

  const book = async (tripId: string) => {
    setMsg(null); setBusy(tripId);
    try {
      await api.transport.bookTrip(tripId);
      setMsg({ text: 'تم الحجز! احتفظ بكود الصعود.', ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل الحجز', ok: false });
    } finally { setBusy(null); }
  };

  const track = async (tripId: string) => {
    try {
      const loc = await api.transport.tripLocation(tripId);
      setLocation((p) => ({ ...p, [tripId]: loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : 'لا يوجد موقع بعد' }));
    } catch {
      setLocation((p) => ({ ...p, [tripId]: 'تعذّر جلب الموقع' }));
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.h1}>رحلاتي</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {mine.length === 0 ? (
          <Text style={s.meta}>لا يوجد حجوزات بعد</Text>
        ) : (
          mine.map((p) => (
            <View key={p.id} style={s.card}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.trip?.route?.name ?? 'رحلة'}</Text>
                <Text style={s.badge}>{p.status_label}</Text>
              </View>
              {p.trip?.scheduled_at && <Text style={s.meta}>{new Date(p.trip.scheduled_at).toLocaleString('ar')}</Text>}
              {p.boarding_code && (
                <View style={s.codeBox}>
                  <Text style={s.codeLabel}>كود الصعود</Text>
                  <Text style={s.code}>{p.boarding_code}</Text>
                </View>
              )}
              <Pressable onPress={() => p.trip && track(p.trip_id)} style={s.trackBtn}>
                <Text style={s.trackText}>تتبّع الكابتن</Text>
              </Pressable>
              {location[p.trip_id] && <Text style={s.meta}>📍 {location[p.trip_id]}</Text>}
            </View>
          ))
        )}

        <Text style={s.section}>رحلات متاحة</Text>
        {loading ? (
          <Text style={s.meta}>جارٍ التحميل...</Text>
        ) : available.length === 0 ? (
          <Text style={s.meta}>لا توجد رحلات مجدولة حالياً</Text>
        ) : (
          available.map((trip) => (
            <View key={trip.id} style={s.card}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{trip.route?.name ?? 'رحلة'}</Text>
                <Text style={s.meta}>{trip.booked_count ?? 0}/{trip.capacity}</Text>
              </View>
              {trip.scheduled_at && <Text style={s.meta}>{new Date(trip.scheduled_at).toLocaleString('ar')}</Text>}
              <Pressable onPress={() => book(trip.id)} disabled={busy === trip.id} style={s.bookBtn}>
                <Text style={s.bookText}>{busy === trip.id ? '...' : 'احجز مقعد'}</Text>
              </Pressable>
            </View>
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
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.md },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    badge: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.primary },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    codeBox: { backgroundColor: `${t.colors.primary}1A`, borderRadius: t.radius.md, padding: t.spacing.sm, marginTop: t.spacing.sm, alignItems: 'center' },
    codeLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.textSecondary },
    code: { fontFamily: t.fontFamily.extrabold, fontSize: 28, letterSpacing: 6, color: t.colors.primary },
    trackBtn: { marginTop: t.spacing.sm, alignSelf: 'flex-end' },
    trackText: { fontFamily: t.fontFamily.medium, color: t.colors.primary, fontSize: 14 },
    bookBtn: { marginTop: t.spacing.sm, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10, alignItems: 'center' },
    bookText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 14 },
  });
