import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { subscribeToTrip } from '../../src/lib/realtime';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Trips() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [mine, setMine] = useState<TripPassenger[]>([]);
  const [available, setAvailable] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [location, setLocation] = useState<Record<string, string>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [rated, setRated] = useState<Record<string, boolean>>({});

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

  // Live tracking via Reverb (auto-updates the location field when configured).
  useEffect(() => {
    const unsubs = mine
      .filter((p) => p.trip)
      .map((p) =>
        subscribeToTrip(p.trip_id, {
          onLocation: (e) =>
            setLocation((prev) => ({ ...prev, [p.trip_id]: `${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}` })),
        }),
      );
    return () => unsubs.forEach((u) => u());
  }, [mine]);

  const book = async (tripId: string) => {
    setMsg(null); setBusy(tripId);
    try {
      await api.transport.bookTrip(tripId);
      setMsg({ text: t('trips.booked'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('trips.bookFailed'), ok: false });
    } finally { setBusy(null); }
  };

  const track = async (tripId: string) => {
    try {
      const loc = await api.transport.tripLocation(tripId);
      setLocation((p) => ({ ...p, [tripId]: loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : t('trips.noLocation') }));
    } catch {
      setLocation((p) => ({ ...p, [tripId]: t('trips.locationError') }));
    }
  };

  const rate = async (tripId: string) => {
    const value = stars[tripId];
    if (!value) return;
    try {
      await api.ratings.rate(tripId, { direction: 'student_rates_driver', stars: value });
      setRated((r) => ({ ...r, [tripId]: true }));
      setMsg({ text: t('rating.done'), ok: true });
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.h1}>{t('trips.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {mine.length === 0 ? (
          <Text style={s.meta}>{t('trips.noBookings')}</Text>
        ) : (
          mine.map((p) => (
            <View key={p.id} style={s.card}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.trip?.route?.name ?? t('trips.defaultName')}</Text>
                <Text style={s.badge}>{p.status_label}</Text>
              </View>
              {p.trip?.scheduled_at && <Text style={s.meta}>{new Date(p.trip.scheduled_at).toLocaleString(locale)}</Text>}
              {p.boarding_code && (
                <View style={s.codeBox}>
                  <Text style={s.codeLabel}>{t('trips.boardingCode')}</Text>
                  <Text style={s.code}>{p.boarding_code}</Text>
                </View>
              )}
              <Pressable onPress={() => p.trip && track(p.trip_id)} style={s.trackBtn}>
                <Text style={s.trackText}>{t('trips.track')}</Text>
              </Pressable>
              {location[p.trip_id] && <Text style={s.meta}>📍 {location[p.trip_id]}</Text>}

              {p.trip?.status === 'completed' && (
                rated[p.trip_id] ? (
                  <Text style={[s.meta, { color: theme.colors.success }]}>{t('rating.done')}</Text>
                ) : (
                  <View style={s.rateBox}>
                    <Text style={s.codeLabel}>{t('rating.title')}</Text>
                    <View style={s.starsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable key={n} onPress={() => setStars((st) => ({ ...st, [p.trip_id]: n }))}>
                          <Text style={[s.star, (stars[p.trip_id] ?? 0) >= n && s.starOn]}>★</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable onPress={() => rate(p.trip_id)} style={s.rateBtn}>
                      <Text style={s.rateText}>{t('rating.submit')}</Text>
                    </Pressable>
                  </View>
                )
              )}
            </View>
          ))
        )}

        <Text style={s.section}>{t('trips.available')}</Text>
        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : available.length === 0 ? (
          <Text style={s.meta}>{t('trips.none')}</Text>
        ) : (
          available.map((trip) => (
            <View key={trip.id} style={s.card}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{trip.route?.name ?? t('trips.defaultName')}</Text>
                <Text style={s.meta}>{trip.booked_count ?? 0}/{trip.capacity}</Text>
              </View>
              {trip.scheduled_at && <Text style={s.meta}>{new Date(trip.scheduled_at).toLocaleString(locale)}</Text>}
              <Pressable onPress={() => book(trip.id)} disabled={busy === trip.id} style={s.bookBtn}>
                <Text style={s.bookText}>{busy === trip.id ? '...' : t('trips.book')}</Text>
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
    rateBox: { marginTop: t.spacing.sm, borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing.sm, alignItems: 'flex-end' },
    starsRow: { flexDirection: 'row-reverse', gap: 4, marginVertical: 6 },
    star: { fontSize: 28, color: t.colors.border },
    starOn: { color: '#E6B23E' },
    rateBtn: { backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 8, paddingHorizontal: t.spacing.lg },
    rateText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },
  });
