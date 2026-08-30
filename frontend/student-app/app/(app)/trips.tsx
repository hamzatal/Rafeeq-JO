import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { formatJod } from '@rafeeq/shared';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Card,
  EmptyState,
  ErrorState,
  Icon,
  PressableScale,
  SkeletonList,
  Text,
  useConfirm,
  useTheme,
  useToast,
  type AppTheme,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   رحلاتي — the list. The live trip lives on `home`.

   ── What moved out, and why it was worse than duplication ──────────────────

   This screen carried a full second copy of the live-trip experience: a Reverb
   subscription, a 12-second polling fallback, a `LiveMap`, the boarding code, the
   drop-off code and a five-step timeline. `home` now has all of it, per
   `docs/design/SCREENS.md` («الرحلة الحيّة ليست ملفاً مستقلاً: هي حالة داخل
   `home`»).

   Two copies of a live tracker is not just twice the code — it is two websocket
   subscriptions to the same channel and two polling timers whenever a student had
   both screens mounted, which the tab bar guarantees. And the boarding code
   rendered in two places, so a fix to one left the other stale.

   What remains is a compact card that says a ride is in progress and opens it.

   ── The captain who was actually the route name ────────────────────────────

   Every history card drew a generic person icon and put `p.trip?.route?.name` in
   the driver-name slot, under `// Driver placeholder`. So a completed ride to
   Yarmouk reported its captain as «اليرموك – حي الجامعة». There was no captain data
   to show — `TripResource` exposed a bare `driver_id` — which is why phase 8 added
   the `captain` block to that resource. The name here is now the captain's name.

   ── `FlatList`, not `ScrollView` + `.map()` ────────────────────────────────

   The history is unbounded: it is every ride the student has ever taken, and
   `GET /trips/mine` returns all of them in one response. `.map()` inside a
   `ScrollView` mounts every row, so the cost of opening this tab grew with
   loyalty. `FlatList` is React Native core — no new native module — and
   `ListHeaderComponent` keeps the header scrolling with the list.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Passenger statuses that still occupy a seat — the pair the API filters on. */
const RIDING = ['booked', 'onboard'];

export default function Trips() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);

  const [mine, setMine] = useState<TripPassenger[]>([]);
  const [available, setAvailable] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
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

  useEffect(() => {
    void load();
  }, [load]);

  const apiMessage = (e: unknown, fallback: string) =>
    e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : fallback;

  const isCancelled = (p: TripPassenger) => p.status === 'cancelled' || p.status === 'no_show';

  const book = async (tripId: string) => {
    setBusy(tripId);
    try {
      await api.transport.bookTrip(tripId);
      toast.success(t('trips.booked'));
      await load();
    } catch (e) {
      toast.error(apiMessage(e, t('trips.bookFailed')));
    } finally {
      setBusy(null);
    }
  };

  /*
   * Cancelling a booking. The endpoint and the service behind it (hold release,
   * subscription-ride refund, request returned to the matching pool, all in one
   * transaction) have existed since the module did — there was simply no client
   * method and no button, so a student who booked the wrong trip was stuck with the
   * hold on their wallet.
   */
  const cancelBooking = async (p: TripPassenger) => {
    const ok = await confirm({
      title: t('trips.cancelBookingTitle'),
      message: t('trips.cancelBookingMsg'),
      confirmLabel: t('trips.cancelBooking'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!ok) return;

    setBusy(p.id);
    try {
      await api.transport.cancelBooking(p.id);
      toast.success(t('trips.bookingCancelled'));
      await load();
    } catch (e) {
      toast.error(apiMessage(e, t('common.error')));
    } finally {
      setBusy(null);
    }
  };

  const rate = async (tripId: string) => {
    const value = stars[tripId];
    if (!value) return;
    try {
      await api.ratings.rate(tripId, { direction: 'student_rates_driver', stars: value });
      setRated((r) => ({ ...r, [tripId]: true }));
      toast.success(t('rating.done'));
    } catch (e) {
      toast.error(apiMessage(e, t('common.error')));
    }
  };

  const activeTrips = mine.filter((p) => RIDING.includes(p.status));
  const history = mine.filter((p) => !RIDING.includes(p.status));
  const filtered = history.filter((p) => (filter === 'cancelled' ? isCancelled(p) : !isCancelled(p)));
  const initial = (user?.full_name ?? 'ر').charAt(0);
  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  const header = (
    <>
      {/* ── Live rides: a pointer, not a second tracker ── */}
      {activeTrips.map((p) => (
        <PressableScale key={p.id} onPress={() => router.push('/(app)/home')} style={s.liveCard} scaleTo={0.98}>
          <View style={s.liveIcon}>
            <Icon name="navigation" size={20} color={theme.colors.onPrimary} />
          </View>
          <View style={s.flex}>
            <Text role="titleSm" tone="inverse" numberOfLines={1}>
              {p.trip?.captain?.name ?? p.trip?.route?.name ?? t('trips.defaultName')}
            </Text>
            <Text role="caption" tone="inverse" numberOfLines={1}>{p.status_label}</Text>
          </View>
          <Text role="label" tone="inverse">{t('trips.openLive')}</Text>
          <Icon name="chevron-left" size={20} color={theme.colors.onPrimary} />
        </PressableScale>
      ))}
      {activeTrips.map((p) => (
        <Pressable
          key={`cancel-${p.id}`}
          onPress={() => void cancelBooking(p)}
          disabled={busy === p.id}
          accessibilityRole="button"
          accessibilityLabel={t('trips.cancelBooking')}
          accessibilityState={{ disabled: busy === p.id, busy: busy === p.id }}
          style={({ pressed }) => [s.cancelRow, pressed && s.pressed]}
        >
          <Icon name="circle-x" size={16} color={theme.colors.danger} />
          <Text role="label" tone="danger">{t('trips.cancelBooking')}</Text>
        </Pressable>
      ))}

      <View style={s.titleRow}>
        <Text role="display" tone="primary">{t('trips.title')}</Text>
        <View style={s.filters}>
          {(['completed', 'cancelled'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="tab"
              accessibilityLabel={t(f === 'completed' ? 'trips.filterCompleted' : 'trips.filterCancelled')}
              accessibilityState={{ selected: filter === f }}
              style={[s.pill, filter === f ? s.pillOn : s.pillOff]}
            >
              <Text role="label" tone={filter === f ? 'inverse' : 'secondary'}>
                {t(f === 'completed' ? 'trips.filterCompleted' : 'trips.filterCancelled')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );

  const footer =
    available.length > 0 ? (
      <>
        <Text role="titleMd" tone="secondary" style={s.section}>{t('trips.available')}</Text>
        {available.map((trip) => (
          <Card key={trip.id}>
            <View style={s.rowBetween}>
              <Text role="titleSm" numberOfLines={1} style={s.flex}>{trip.route?.name ?? t('trips.defaultName')}</Text>
              <View style={s.seats}>
                <Icon name="users" size={14} color={theme.colors.textSecondary} />
                {/* `booked_count` now means SEATS TAKEN. It used to count cancelled
                    rows too, so a trip three students had abandoned looked full. */}
                <Text role="label" tone="secondary">{trip.booked_count ?? 0}/{trip.capacity}</Text>
              </View>
            </View>
            {trip.scheduled_at ? <Text role="caption" tone="secondary">{fmtDate(trip.scheduled_at)}</Text> : null}
            <Pressable
              onPress={() => void book(trip.id)}
              disabled={busy === trip.id}
              accessibilityRole="button"
              accessibilityLabel={t('trips.book')}
              accessibilityState={{ disabled: busy === trip.id, busy: busy === trip.id }}
              style={s.bookBtn}
            >
              <Text role="titleSm" tone="inverse" align="center">
                {busy === trip.id ? t('common.loading') : t('trips.book')}
              </Text>
            </Pressable>
          </Card>
        ))}
      </>
    ) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text role="titleMd" tone="primary">{initial}</Text>
        </View>
        <Text role="displayMd" tone="primary">{t('common.appName')}</Text>
        <Pressable
          onPress={() => router.push('/(app)/notifications')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.notifications')}
          hitSlop={8}
          style={s.headerBtn}
        >
          <Icon name="bell" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={loading || loadError ? [] : filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          loading ? (
            <SkeletonList rows={3} />
          ) : loadError ? (
            <ErrorState
              title={t('common.error')}
              message={t('common.loadFailed')}
              retryLabel={t('common.retry')}
              onRetry={() => void load()}
            />
          ) : (
            <EmptyState icon="navigation" title={t('trips.noHistory')} />
          )
        }
        renderItem={({ item: p }) => {
          const cancelled = isCancelled(p);
          const completed = p.trip?.status === 'completed' || p.status === 'dropped';
          const fare = p.trip?.pricing?.fare_fils;
          const captain = p.trip?.captain;
          const vehicle = captain?.vehicle;

          return (
            <View style={[s.tripCard, cancelled && s.tripCardCancelled]}>
              <View style={s.topRow}>
                <View style={s.driverInfo}>
                  <View style={s.driverAvatar}>
                    {captain?.name ? (
                      <Text role="titleSm" tone="secondary">{captain.name.charAt(0)}</Text>
                    ) : (
                      <Icon name="user" size={22} color={theme.colors.textSecondary} />
                    )}
                  </View>
                  <View style={s.flex}>
                    <Text role="titleSm" numberOfLines={1}>{captain?.name ?? t('trips.captainFallback')}</Text>
                    <Text role="caption" tone="secondary" numberOfLines={1}>
                      {vehicle ? [vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(' ') : p.status_label}
                    </Text>
                  </View>
                </View>
                <View style={s.topEnd}>
                  <Text role="titleSm" tone={cancelled ? 'secondary' : 'primary'}>
                    {cancelled ? formatJod(0) : (fare != null ? formatJod(fare) : '—')}
                  </Text>
                  <View style={[s.statusPill, { backgroundColor: cancelled ? theme.colors.dangerSoft : theme.colors.accentSoft }]}>
                    <Icon name={cancelled ? 'circle-x' : 'circle-check'} size={13} color={cancelled ? theme.colors.danger : theme.colors.accent} />
                    <Text role="caption" tone={cancelled ? 'danger' : 'success'}>
                      {t(cancelled ? 'trips.filterCancelled' : 'trips.filterCompleted')}
                    </Text>
                  </View>
                </View>
              </View>

              {/*
                Two labelled ends with REAL times on both. The lower end previously had
                no time at all, and the upper one borrowed `scheduled_at` for a leg it
                did not describe.
              */}
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
                    <Text role="bodyLg" numberOfLines={1}>{t('trips.originLabel')}</Text>
                    <Text role="caption" tone="secondary">{fmtDate(p.trip?.started_at ?? p.trip?.scheduled_at)}</Text>
                  </View>
                  <View>
                    <Text role="bodyLg" numberOfLines={1}>{p.trip?.route?.name ?? t('trips.destinationLabel')}</Text>
                    <Text role="caption" tone="secondary">{fmtDate(p.trip?.ended_at)}</Text>
                  </View>
                </View>
              </View>

              {completed && !rated[p.trip_id] ? (
                <View style={s.starsInline}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setStars((st) => ({ ...st, [p.trip_id]: n }))}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('a11y.rateStars')} ${n}`}
                      accessibilityState={{ selected: (stars[p.trip_id] ?? 0) >= n }}
                    >
                      <Icon name="star" size={20} color={(stars[p.trip_id] ?? 0) >= n ? theme.colors.accent : theme.colors.border} />
                    </Pressable>
                  ))}
                  {stars[p.trip_id] ? (
                    <Pressable
                      onPress={() => void rate(p.trip_id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('rating.rate')}
                      style={s.rateBtn}
                    >
                      <Text role="label" tone="inverse">{t('rating.rate')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : rated[p.trip_id] ? (
                <Text role="caption" tone="success" align="center">{t('rating.done')}</Text>
              ) : null}

              <View style={s.cardActions}>
                <Pressable
                  onPress={() => router.push('/(app)/ride-request')}
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.rebook')}
                  style={s.rebookBtn}
                >
                  <Text role="titleSm" tone="inverse" align="center">{t('trips.rebook')}</Text>
                </Pressable>
                {!cancelled ? (
                  /* The receipt lives on the wallet now — `payments.tsx` was absorbed
                     into it, so this pushed a route that no longer exists. */
                  <Pressable
                    onPress={() => router.push('/(app)/wallet')}
                    accessibilityRole="button"
                    accessibilityLabel={t('trips.downloadInvoice')}
                    style={s.invoiceBtn}
                  >
                    <Text role="titleSm" tone="primary" align="center">{t('trips.downloadInvoice')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    flex: { flex: 1 },
    pressed: { opacity: 0.75 },
    header: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, backgroundColor: t.colors.surface, ...t.shadow.sm,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    avatar: {
      width: 40, height: 40, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceHighest,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border,
    },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    liveCard: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md,
      backgroundColor: t.colors.primary, borderRadius: t.radius.card, padding: t.spacing.md, ...t.shadow.md,
    },
    liveIcon: { width: 40, height: 40, borderRadius: t.radius.pill, backgroundColor: t.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    cancelRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: t.spacing.md },

    titleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.md, gap: t.spacing.sm },
    filters: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: t.radius.pill, borderWidth: 1 },
    pillOn: { backgroundColor: t.colors.primary, borderColor: t.colors.transparent, ...t.shadow.sm },
    pillOff: { backgroundColor: t.colors.surface, borderColor: t.colors.border },

    section: { marginTop: t.spacing.lg, marginBottom: t.spacing.md },
    rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: t.spacing.sm },
    seats: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    bookBtn: { marginTop: t.spacing.sm, backgroundColor: t.colors.primary, borderRadius: t.radius.control, paddingVertical: 12 },

    tripCard: {
      backgroundColor: t.colors.surface, borderRadius: t.radius.control, borderWidth: 1, borderColor: t.colors.border,
      padding: 16, marginBottom: t.spacing.sm, ...t.shadow.sm,
    },
    tripCardCancelled: { opacity: 0.75 },
    topRow: {
      flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between',
      borderBottomWidth: 1, borderBottomColor: t.colors.border, paddingBottom: 16, marginBottom: 16, gap: t.spacing.sm,
    },
    driverInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    topEnd: { alignItems: 'flex-start', gap: 4 },
    statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.pill },

    route: { flexDirection: 'row-reverse', gap: 12, marginBottom: 16 },
    routeSide: { alignItems: 'center', paddingTop: 3 },
    dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface },
    dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.surface },
    connector: { width: 2, flex: 1, minHeight: 20, backgroundColor: t.colors.border, marginVertical: 2 },
    routeContent: { flex: 1, gap: 20 },

    starsInline: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 12 },
    rateBtn: { backgroundColor: t.colors.primary, borderRadius: t.radius.control, paddingVertical: 6, paddingHorizontal: 12, marginEnd: 6 },

    cardActions: { flexDirection: 'row-reverse', gap: 8, paddingTop: 8 },
    rebookBtn: { flex: 1, backgroundColor: t.colors.primary, borderRadius: 8, paddingVertical: 10 },
    invoiceBtn: { flex: 1, borderWidth: 2, borderColor: t.colors.primary, borderRadius: 8, paddingVertical: 10 },
  });
