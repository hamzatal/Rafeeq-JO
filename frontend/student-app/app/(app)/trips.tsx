import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { LiveMap } from '../../src/components/LiveMap';
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
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
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

  useEffect(() => {
    const unsubs = mine
      .filter((p) => p.trip)
      .map((p) =>
        subscribeToTrip(p.trip_id, {
          onLocation: (e) => { setLocation((prev) => ({ ...prev, [p.trip_id]: `${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}` })); setCoords((prev) => ({ ...prev, [p.trip_id]: { lat: e.lat, lng: e.lng } })); },
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
      if (loc) setCoords((p) => ({ ...p, [tripId]: { lat: loc.lat, lng: loc.lng } }));
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
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('trips.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {mine.length === 0 ? (
          <EmptyState icon="navigation" title={t('trips.noBookings')} />
        ) : (
          mine.map((p) => (
            <Card key={p.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.trip?.route?.name ?? t('trips.defaultName')}</Text>
                <Badge label={p.status_label} tone={p.trip?.status === 'completed' ? 'success' : 'primary'} />
              </View>
              {p.trip?.scheduled_at && <Text style={s.meta}>{new Date(p.trip.scheduled_at).toLocaleString(locale)}</Text>}

              {p.boarding_code && p.status === 'booked' && (
                <View style={s.codeBox}>
                  <Text style={s.codeLabel}>{t('trips.boardingCode')}</Text>
                  <Text style={s.code}>{p.boarding_code}</Text>
                </View>
              )}

              {p.dropoff_code && p.status === 'onboard' && (
                <View style={s.codeBox}>
                  <Text style={s.codeLabel}>{t('trips.dropoffCode')}</Text>
                  <Text style={s.code}>{p.dropoff_code}</Text>
                  <Text style={s.meta}>{t('trips.dropoffHint')}</Text>
                </View>
              )}

              <Pressable onPress={() => p.trip && track(p.trip_id)} style={s.trackBtn}>
                <Icon name="map-pin" size={16} color={theme.colors.primary} />
                <Text style={s.trackText}>{t('trips.track')}</Text>
              </Pressable>
              {location[p.trip_id] && <Text style={s.meta}>📍 {location[p.trip_id]}</Text>}
              {coords[p.trip_id] && (
                <LiveMap points={[{ ...coords[p.trip_id], kind: 'captain', label: t('trips.track') }]} height={200} />
              )}

              {p.trip?.status === 'completed' && (
                rated[p.trip_id] ? (
                  <Text style={[s.meta, { color: theme.colors.success }]}>{t('rating.done')}</Text>
                ) : (
                  <View style={s.rateBox}>
                    <Text style={s.codeLabel}>{t('rating.title')}</Text>
                    <View style={s.starsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable key={n} onPress={() => setStars((st) => ({ ...st, [p.trip_id]: n }))}>
                          <Icon name="star" size={26} color={(stars[p.trip_id] ?? 0) >= n ? theme.colors.accent : theme.colors.border} />
                        </Pressable>
                      ))}
                    </View>
                    <Pressable onPress={() => rate(p.trip_id)} style={s.rateBtn}>
                      <Text style={s.rateText}>{t('rating.submit')}</Text>
                    </Pressable>
                  </View>
                )
              )}
            </Card>
          ))
        )}

        <SectionTitle title={t('trips.available')} />
        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : available.length === 0 ? (
          <EmptyState icon="calendar" title={t('trips.none')} />
        ) : (
          available.map((trip) => (
            <Card key={trip.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{trip.route?.name ?? t('trips.defaultName')}</Text>
                <View style={s.seats}>
                  <Icon name="users" size={14} color={theme.colors.textSecondary} />
                  <Text style={s.seatsText}>{trip.booked_count ?? 0}/{trip.capacity}</Text>
                </View>
              </View>
              {trip.scheduled_at && <Text style={s.meta}>{new Date(trip.scheduled_at).toLocaleString(locale)}</Text>}
              <Pressable onPress={() => book(trip.id)} disabled={busy === trip.id} style={s.bookBtn}>
                <Text style={s.bookText}>{busy === trip.id ? '...' : t('trips.book')}</Text>
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, flex: 1, textAlign: 'right' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    seats: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    seatsText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    codeBox: { backgroundColor: t.colors.primarySoft, borderRadius: t.radius.md, padding: t.spacing.sm, marginTop: t.spacing.sm, alignItems: 'center' },
    codeLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.textSecondary },
    code: { fontFamily: t.fontFamily.extrabold, fontSize: 28, letterSpacing: 6, color: t.colors.primary },
    trackBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: t.spacing.sm, alignSelf: 'flex-end' },
    trackText: { fontFamily: t.fontFamily.medium, color: t.colors.primary, fontSize: 14 },
    bookBtn: { marginTop: t.spacing.sm, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12, alignItems: 'center' },
    bookText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 14 },
    rateBox: { marginTop: t.spacing.sm, borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing.sm, alignItems: 'flex-end' },
    starsRow: { flexDirection: 'row-reverse', gap: 4, marginVertical: 6 },
    rateBtn: { backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 8, paddingHorizontal: t.spacing.lg },
    rateText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },
  });
