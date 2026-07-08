import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { LiveMap } from '../../src/components/LiveMap';
import { TripTimeline } from '../../src/components/kit';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { subscribeToTrip, realtimeEnabled } from '../../src/lib/realtime';
import { useTheme, type AppTheme } from '../../src/theme';

const ACTIVE_STATUSES = ['booked', 'onboard'];

export default function Trips() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);

  const [mine, setMine] = useState<TripPassenger[]>([]);
  const [available, setAvailable] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [location, setLocation] = useState<Record<string, string>>({});
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [rated, setRated] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'completed' | 'cancelled'>('completed');

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

  useEffect(() => {
    if (realtimeEnabled()) return;
    const active = mine.filter((p) => p.trip && ACTIVE_STATUSES.includes(p.status));
    if (active.length === 0) return;
    const id = setInterval(() => { active.forEach((p) => void track(p.trip_id)); }, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine]);

  const stepFor = (p: TripPassenger) => {
    if (p.status === 'onboard') return 1;
    if (p.status === 'dropped' || p.trip?.status === 'completed') return 2;
    return 0;
  };
  const isCancelled = (p: TripPassenger) => p.status === 'cancelled' || p.status === 'no_show';

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

  const activeTrips = mine.filter((p) => ACTIVE_STATUSES.includes(p.status));
  const history = mine.filter((p) => !ACTIVE_STATUSES.includes(p.status));
  const filtered = history.filter((p) => (filter === 'cancelled' ? isCancelled(p) : !isCancelled(p)));
  const initial = (user?.full_name ?? 'ر').charAt(0);
  const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.push('/(app)/notifications')} hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={s.brand}>رفيق</Text>
        <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('trips.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {/* Active trips — full tracking (timeline + code + live map + rating) */}
        {activeTrips.length > 0 && (
          <>
            <Text style={s.section}>{t('trips.currentTrips')}</Text>
            {activeTrips.map((p) => (
              <Card key={p.id}>
                <View style={s.rowBetween}>
                  <Text style={s.cardTitle}>{p.trip?.route?.name ?? t('trips.defaultName')}</Text>
                  <Badge label={p.status_label} tone="primary" />
                </View>
                {p.trip?.scheduled_at && <Text style={s.meta}>{fmtDate(p.trip.scheduled_at)}</Text>}
                <TripTimeline
                  title={t('trips.tlStatus')}
                  steps={[t('trips.tlBooked'), t('trips.tlOnboard'), t('trips.tlArrived')]}
                  current={stepFor(p)}
                  cancelled={isCancelled(p)}
                />
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
                <View style={s.actionRow}>
                  <Pressable onPress={() => p.trip && track(p.trip_id)} style={s.ghostBtn}>
                    <Icon name="map-pin" size={16} color={theme.colors.primary} />
                    <Text style={s.ghostText}>{t('trips.track')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push({ pathname: '/(app)/chat', params: { tripId: p.trip_id, title: t('chat.withCaptain') } })}
                    style={s.ghostBtn}
                  >
                    <Icon name="message-circle" size={16} color={theme.colors.primary} />
                    <Text style={s.ghostText}>{t('chat.open')}</Text>
                  </Pressable>
                </View>
                {coords[p.trip_id] && (
                  <View style={s.liveMap}>
                    <LiveMap points={[{ ...coords[p.trip_id], kind: 'captain', label: t('trips.track') }]} height={180} legend={false} />
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {/* History filter */}
        <View style={s.segment}>
          <Pressable onPress={() => setFilter('completed')} style={[s.segBtn, filter === 'completed' && s.segBtnOn]}>
            <Text style={[s.segText, filter === 'completed' && s.segTextOn]}>{t('trips.filterCompleted')}</Text>
          </Pressable>
          <Pressable onPress={() => setFilter('cancelled')} style={[s.segBtn, filter === 'cancelled' && s.segBtnOn]}>
            <Text style={[s.segText, filter === 'cancelled' && s.segTextOn]}>{t('trips.filterCancelled')}</Text>
          </Pressable>
        </View>

        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : filtered.length === 0 ? (
          <EmptyState icon="navigation" title={t('trips.noHistory')} />
        ) : (
          filtered.map((p) => {
            const cancelled = isCancelled(p);
            const completed = p.trip?.status === 'completed' || p.status === 'dropped';
            return (
              <View key={p.id} style={s.tripCard}>
                <View style={s.rowBetween}>
                  <Badge label={p.status_label} tone={cancelled ? 'danger' : 'success'} />
                  <Text style={s.tripDate}>{fmtDate(p.trip?.scheduled_at)}</Text>
                </View>
                {/* Route line */}
                <View style={s.route}>
                  <View style={s.routeSide}>
                    <View style={[s.routeDot, { backgroundColor: theme.colors.accent }]} />
                    <View style={s.routeConnector} />
                    <Icon name="map-pin" size={14} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.routeText} numberOfLines={1}>{t('trips.originLabel')}</Text>
                    <View style={{ height: 14 }} />
                    <Text style={s.routeText} numberOfLines={1}>{p.trip?.route?.name ?? t('trips.defaultName')}</Text>
                  </View>
                </View>
                {/* Actions */}
                <View style={s.actionRow}>
                  {completed && !rated[p.trip_id] ? (
                    <View style={s.starsInline}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable key={n} onPress={() => setStars((st) => ({ ...st, [p.trip_id]: n }))} hitSlop={4}>
                          <Icon name="star" size={20} color={(stars[p.trip_id] ?? 0) >= n ? theme.colors.accent : theme.colors.border} />
                        </Pressable>
                      ))}
                      {stars[p.trip_id] ? (
                        <Pressable onPress={() => rate(p.trip_id)} style={s.rateBtn}>
                          <Text style={s.rateText}>{t('rating.rate')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : rated[p.trip_id] ? (
                    <Text style={[s.meta, { color: theme.colors.success }]}>{t('rating.done')}</Text>
                  ) : <View style={{ flex: 1 }} />}
                  <Pressable onPress={() => router.push('/(app)/ride-request')} style={s.rebookBtn}>
                    <Text style={s.rebookText}>{t('trips.rebook')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* Available trips to book */}
        {available.length > 0 && (
          <>
            <Text style={s.section}>{t('trips.available')}</Text>
            {available.map((trip) => (
              <Card key={trip.id}>
                <View style={s.rowBetween}>
                  <Text style={s.cardTitle}>{trip.route?.name ?? t('trips.defaultName')}</Text>
                  <View style={s.seats}>
                    <Icon name="users" size={14} color={theme.colors.textSecondary} />
                    <Text style={s.seatsText}>{trip.booked_count ?? 0}/{trip.capacity}</Text>
                  </View>
                </View>
                {trip.scheduled_at && <Text style={s.meta}>{fmtDate(trip.scheduled_at)}</Text>}
                <Pressable onPress={() => book(trip.id)} disabled={busy === trip.id} style={s.bookBtn}>
                  <Text style={s.bookText}>{busy === trip.id ? '...' : t('trips.book')}</Text>
                </Pressable>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.onPrimary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.primary, textAlign: 'right', marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.md },

    rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, flex: 1, textAlign: 'right' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },

    codeBox: { backgroundColor: t.colors.primarySoft, borderRadius: t.radius.md, padding: t.spacing.sm, marginTop: t.spacing.sm, alignItems: 'center' },
    codeLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.textSecondary },
    code: { fontFamily: t.fontFamily.extrabold, fontSize: 28, letterSpacing: 6, color: t.colors.primary },
    liveMap: { borderRadius: t.radius.md, overflow: 'hidden', marginTop: t.spacing.sm },

    actionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, marginTop: t.spacing.md },
    ghostBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md, paddingVertical: 9, paddingHorizontal: 14 },
    ghostText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary },

    segment: { flexDirection: 'row-reverse', backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: 4, marginTop: t.spacing.lg, marginBottom: t.spacing.md },
    segBtn: { flex: 1, paddingVertical: 10, borderRadius: t.radius.sm, alignItems: 'center' },
    segBtnOn: { backgroundColor: t.colors.primary },
    segText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary },
    segTextOn: { fontFamily: t.fontFamily.bold, color: t.colors.onPrimary },

    tripCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, marginBottom: t.spacing.md, ...t.shadow.sm },
    tripDate: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },
    route: { flexDirection: 'row-reverse', gap: t.spacing.md, marginTop: t.spacing.md },
    routeSide: { alignItems: 'center', paddingTop: 4 },
    routeDot: { width: 10, height: 10, borderRadius: 5 },
    routeConnector: { width: 2, height: 24, backgroundColor: t.colors.border, marginVertical: 2 },
    routeText: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.text, textAlign: 'right' },

    starsInline: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    rateBtn: { backgroundColor: t.colors.primary, borderRadius: t.radius.sm, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6 },
    rateText: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.onPrimary },
    rebookBtn: { backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10, paddingHorizontal: t.spacing.lg },
    rebookText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.onPrimary },

    seats: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    seatsText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    bookBtn: { marginTop: t.spacing.sm, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12, alignItems: 'center' },
    bookText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 14 },
  });
