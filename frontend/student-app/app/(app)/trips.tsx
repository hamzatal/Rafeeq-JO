import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, Badge, SkeletonList, ErrorState } from '../../src/components/ui';
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
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [location, setLocation] = useState<Record<string, string>>({});
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [rated, setRated] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'completed' | 'cancelled'>('completed');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [m, a] = await Promise.all([api.transport.myTrips(), api.transport.availableTrips()]);
      setMine(m);
      setAvailable(a);
    } catch {
      setLoadError(true);
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
  const fareJod = (p: TripPassenger) => {
    const fils = p.trip?.pricing?.fare_fils;
    return fils != null ? `${(fils / 1000).toFixed(2)} ${t('subscriptions.currency')}` : null;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — avatar (right) · Rafeeq · bell (left) per Stitch _17 */}
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
        <Text style={s.brand}>رفيق</Text>
        <Pressable onPress={() => router.push('/(app)/notifications')} hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
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

        {/* Title + inline filter pills (Stitch _17) */}
        <View style={s.titleRow}>
          <Text style={s.h2}>{t('trips.title')}</Text>
          <View style={s.filters}>
            <Pressable onPress={() => setFilter('completed')} style={[s.pill, filter === 'completed' ? s.pillOn : s.pillOff]}>
              <Text style={[s.pillText, filter === 'completed' ? s.pillTextOn : s.pillTextOff]}>{t('trips.filterCompleted')}</Text>
            </Pressable>
            <Pressable onPress={() => setFilter('cancelled')} style={[s.pill, filter === 'cancelled' ? s.pillOn : s.pillOff]}>
              <Text style={[s.pillText, filter === 'cancelled' ? s.pillTextOn : s.pillTextOff]}>{t('trips.filterCancelled')}</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <SkeletonList rows={3} />
        ) : loadError ? (
          <ErrorState title={t('common.error')} message={t('common.loadFailed')} retryLabel={t('common.retry')} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="navigation" title={t('trips.noHistory')} />
        ) : (
          filtered.map((p) => {
            const cancelled = isCancelled(p);
            const completed = p.trip?.status === 'completed' || p.status === 'dropped';
            const fare = fareJod(p);
            return (
              <View key={p.id} style={[s.tripCard, cancelled && s.tripCardCancelled]}>
                {/* Top: driver placeholder + fare + status */}
                <View style={s.topRow}>
                  <View style={s.driverInfo}>
                    <View style={s.driverAvatar}>
                      <Icon name="user" size={22} color={theme.colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.driverName} numberOfLines={1}>{p.trip?.route?.name ?? t('trips.defaultName')}</Text>
                      <Text style={s.driverSub} numberOfLines={1}>{p.status_label}</Text>
                    </View>
                  </View>
                  <View style={s.topLeft}>
                    <Text style={[s.fare, cancelled && { color: theme.colors.textSecondary }]}>{cancelled ? `0.00 ${t('subscriptions.currency')}` : (fare ?? '—')}</Text>
                    <View style={[s.statusPill, { backgroundColor: cancelled ? theme.colors.dangerSoft : theme.colors.accentSoft }]}>
                      <Icon name={cancelled ? 'x-circle' : 'check-circle'} size={13} color={cancelled ? theme.colors.danger : theme.colors.accent} />
                      <Text style={[s.statusText, { color: cancelled ? theme.colors.danger : theme.colors.accent }]}>{cancelled ? t('trips.filterCancelled') : t('trips.filterCompleted')}</Text>
                    </View>
                  </View>
                </View>

                {/* Route timeline */}
                <View style={s.route}>
                  <View style={s.routeSide}>
                    <View style={[s.dot, { backgroundColor: cancelled ? theme.colors.muted : theme.colors.accent }]}>
                      <View style={s.dotInner} />
                    </View>
                    <View style={s.connector} />
                    <View style={[s.dot, { backgroundColor: cancelled ? theme.colors.muted : theme.colors.primary }]}>
                      <Icon name="map-pin" size={11} color={theme.colors.onPrimary} />
                    </View>
                  </View>
                  <View style={s.routeContent}>
                    <View>
                      <Text style={s.routeText} numberOfLines={1}>{t('trips.originLabel')}</Text>
                      <Text style={s.routeTime}>{fmtDate(p.trip?.scheduled_at)}</Text>
                    </View>
                    <View>
                      <Text style={s.routeText} numberOfLines={1}>{p.trip?.route?.name ?? t('trips.defaultName')}</Text>
                    </View>
                  </View>
                </View>

                {/* Rating (completed & unrated) — preserved functionality */}
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
                  <Text style={[s.meta, { color: theme.colors.success, textAlign: 'center' }]}>{t('rating.done')}</Text>
                ) : null}

                {/* Actions */}
                <View style={s.cardActions}>
                  <Pressable onPress={() => router.push('/(app)/ride-request')} style={s.rebookBtn}>
                    <Text style={s.rebookText}>{t('trips.rebook')}</Text>
                  </Pressable>
                  {!cancelled && (
                    <Pressable onPress={() => router.push('/(app)/payments')} style={s.invoiceBtn}>
                      <Text style={s.invoiceText}>{t('trips.downloadInvoice')}</Text>
                    </Pressable>
                  )}
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
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, backgroundColor: t.colors.surface, ...t.shadow.sm },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 32, lineHeight: 40, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.md },

    // Title + filter pills row
    titleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.md },
    h2: { fontFamily: t.fontFamily.semibold, fontSize: 24, lineHeight: 32, color: t.colors.text, textAlign: 'right' },
    filters: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
    pillOn: { backgroundColor: t.colors.primary, borderColor: 'transparent', ...t.shadow.sm },
    pillOff: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    pillText: { fontFamily: t.fontFamily.medium, fontSize: 14 },
    pillTextOn: { color: t.colors.onPrimary },
    pillTextOff: { color: t.colors.textSecondary },

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

    // History trip card (_17)
    tripCard: { backgroundColor: t.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, padding: 16, marginBottom: t.spacing.sm, ...t.shadow.sm },
    tripCardCancelled: { opacity: 0.75 },
    topRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: t.colors.border, paddingBottom: 16, marginBottom: 16 },
    driverInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    driverName: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.text, textAlign: 'right' },
    driverSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    topLeft: { alignItems: 'flex-start' },
    fare: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.primary },
    statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, marginTop: 4 },
    statusText: { fontFamily: t.fontFamily.medium, fontSize: 12 },

    route: { flexDirection: 'row-reverse', gap: 12, marginBottom: 16 },
    routeSide: { alignItems: 'center', paddingTop: 3 },
    dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface },
    dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.surface },
    connector: { width: 2, flex: 1, minHeight: 20, backgroundColor: t.colors.border, marginVertical: 2 },
    routeContent: { flex: 1, gap: 20 },
    routeText: { fontFamily: t.fontFamily.regular, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    routeTime: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    starsInline: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 12 },
    rateBtn: { backgroundColor: t.colors.primary, borderRadius: t.radius.sm, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6 },
    rateText: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.onPrimary },

    cardActions: { flexDirection: 'row-reverse', gap: 8, paddingTop: 8 },
    rebookBtn: { flex: 1, backgroundColor: t.colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    rebookText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.onPrimary },
    invoiceBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 2, borderColor: t.colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    invoiceText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.primary },

    seats: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    seatsText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    bookBtn: { marginTop: t.spacing.sm, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12, alignItems: 'center' },
    bookText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 14 },
  });
