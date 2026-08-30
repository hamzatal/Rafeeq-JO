import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { formatJod } from '@rafeeq/shared';
import type { RideRequest, SavedAddress, TripPassenger, University } from '@rafeeq/shared';
import { brand } from '@rafeeq/tokens';
import {
  getCurrentLocation,
  Icon,
  LiveMap,
  PressableScale,
  Text,
  useConfirm,
  useTheme,
  useToast,
  watchLocation,
  type AppTheme,
  type IconName,
  type MapPoint,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { realtimeEnabled, subscribeToTrip } from '../../src/lib/realtime';

/* ═══════════════════════════════════════════════════════════════════════════
   THE MAP IS THE SCREEN, and the live trip is a STATE of it.

   ── Two screens in one file, on purpose ────────────────────────────────────

   `docs/design/SCREENS.md`: «الرحلة الحيّة ليست ملفاً مستقلاً: هي حالة داخل
   `home`». That is not filing tidiness. A rider with a captain three minutes away
   opens the app to find out where the car is; if that lives on another route, the
   first thing the app shows them is a destination picker for a ride they already
   have. So the screen asks two questions on mount — do I have a request, do I have
   a seat — and renders whichever answer it gets.

   ── What was deleted, and why it could not be "wired up instead" ───────────

   The old version drew a pulsing car in the upper third of the map with a badge
   reading «٣ دقائق». Both were fabricated:

     • the marker had NO coordinates — it was positioned at `height / 3`, in screen
       space, so it sat in the same pixel regardless of where the student was;
     • the «٣» was a hardcoded Arabic-Indic literal, not a number from anywhere.

   And it cannot be fixed by connecting it to data, because there is no data: this
   API has no nearby-captains endpoint. `Modules/Safety` stores captain positions,
   but the route is `role:driver` and write-only, and `GET /trips/{id}/location`
   deliberately refuses anyone who is not a passenger of that specific trip
   («captain GPS must not leak to arbitrary users»). A "cars around you" layer would
   have to invent its cars. So the idle map shows the two points that ARE real: the
   student, and the campus they are going to.

   ── Why a distance and not an ETA ──────────────────────────────────────────

   Once a trip exists we hold the captain's true coordinate. An ETA from that needs a
   route and traffic, and we have neither, so a minutes figure would be the «٣»
   again with extra steps. A straight-line distance between two real coordinates is
   something we can actually compute, and it answers the question the rider is asking
   («is he close?») without pretending to know the road.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Passenger statuses that still occupy a seat — the same pair the API filters on. */
const RIDING = ['booked', 'onboard'];

/** Ride-request statuses that mean "this ride has not happened yet". */
const OPEN_REQUEST = ['pending', 'grouped', 'assigned'];

const PEEK = 108; // sheet height when collapsed: handle + title row

/**
 * Named, because `check:money` reads a bare `/ 1000` as a fils→dinar conversion and
 * it is right to: that division is how money gets mis-displayed. This one is metres
 * to kilometres, and saying so in the identifier is cheaper than an exemption.
 */
const METRES_PER_KM = 1000;

/** Metres between two coordinates (haversine, Earth radius 6371 km). */
function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function greetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'goodMorning';
  if (h < 18) return 'goodAfternoon';
  return 'goodEvening';
}

const ADDRESS_ICON: Record<string, IconName> = {
  home: 'house',
  university: 'graduation-cap',
  work: 'briefcase',
};

export default function Home() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const user = useAuth((st) => st.user);
  const { height } = useWindowDimensions();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [unread, setUnread] = useState(0);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressError, setAddressError] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, number | null>>({});
  const [request, setRequest] = useState<RideRequest | null>(null);
  const [seat, setSeat] = useState<TripPassenger | null>(null);
  const [captain, setCaptain] = useState<{ lat: number; lng: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);

  const sheetY = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const sheetH = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);

  /*
   * The student's own position, then the two questions.
   *
   * `mine()` returns every request and every seat the student has ever had — there
   * is no "current ride" endpoint — so the filtering is here, on the same two status
   * sets the backend uses. `find` on a `latest()`-ordered list gives the newest.
   */
  /*
   * Saved destinations, and the difference between "you have none" and "we could
   * not ask".
   *
   * This was `api.addresses.list().then(setAddresses).catch(() => undefined)`, so a
   * failed request left the list empty and the sheet rendered «احفظ بيتك وجامعتك» —
   * telling a student who has three saved places to go and save some. Same bug shape
   * the `empty-without-error` gate exists for, in a spot the gate does not reach
   * because the empty state is not a `ListState`.
   */
  const loadAddresses = useCallback(async () => {
    setAddressError(false);
    try {
      setAddresses(await api.addresses.list());
    } catch {
      setAddressError(true);
    }
  }, []);

  const loadRide = useCallback(async () => {
    const [requests, seats] = await Promise.all([
      api.rideRequests.mine().catch(() => [] as RideRequest[]),
      api.transport.myTrips().catch(() => [] as TripPassenger[]),
    ]);
    setRequest(requests.find((r) => OPEN_REQUEST.includes(r.status)) ?? null);
    setSeat(seats.find((p) => RIDING.includes(p.status)) ?? null);
  }, []);

  useEffect(() => {
    void getCurrentLocation().then((loc) => loc && setMyLoc(loc));
    const stopWatching = watchLocation((loc) => setMyLoc(loc));

    /* An unread badge that fails is a dot that does not appear. Nothing to say. */
    api.notifications.unreadCount().then(setUnread).catch(() => undefined);
    void loadAddresses();
    void loadRide();

    /*
     * The student's own university comes from their profile; the coordinates come
     * from the catalog. Both are needed to draw the destination pin and to price a
     * ride, and a profile without a university is a legitimate state (onboarding
     * skipped), so this falls back to the first active campus rather than showing
     * nothing.
     */
    void Promise.all([
      api.catalog.listUniversities().catch(() => [] as University[]),
      api.student.getProfile().then((p) => p.university_id).catch(() => null),
    ]).then(([unis, profileUni]) => {
      setUniversities(unis);
      setUniversityId(profileUni ?? unis[0]?.id ?? null);
    });

    return stopWatching;
  }, [loadRide, loadAddresses]);

  /* ── The captain's position: push first, poll only when push is unavailable ── */
  const tripId = seat?.trip_id ?? null;

  useEffect(() => {
    if (!tripId) {
      setCaptain(null);
      return;
    }
    void api.transport.tripLocation(tripId).then((loc) => loc && setCaptain({ lat: loc.lat, lng: loc.lng })).catch(() => undefined);

    const unsubscribe = subscribeToTrip(tripId, { onLocation: (e) => setCaptain({ lat: e.lat, lng: e.lng }) });
    if (realtimeEnabled()) return unsubscribe;

    const timer = setInterval(() => {
      void api.transport.tripLocation(tripId).then((loc) => loc && setCaptain({ lat: loc.lat, lng: loc.lng })).catch(() => undefined);
    }, 12000);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [tripId]);

  /*
   * While a request is open but no seat exists yet, the matcher is still working.
   * Re-ask every 15 seconds so the sheet moves from «تم الطلب» to a real captain
   * without the student pulling to refresh.
   */
  useEffect(() => {
    if (!request || seat) return;
    const timer = setInterval(() => void loadRide(), 15000);
    return () => clearInterval(timer);
  }, [request, seat, loadRide]);

  const uni = universities.find((u) => u.id === universityId) ?? null;
  const uniCoords = uni?.lat != null && uni.lng != null ? { lat: uni.lat, lng: uni.lng } : null;
  const uniName = uni ? (locale === 'ar' ? uni.name_ar : uni.name_en) : null;

  /*
   * One announced price per destination, from the same endpoint the request screen
   * quotes. The design shows a number beside every row precisely so the rider never
   * taps into a price — and an unpriced corridor renders no number at all rather
   * than a zero, because `pricing_source` can come back as something other than the
   * approved matrix.
   */
  const priceable = useMemo(
    () =>
      addresses
        .filter((a) => a.lat != null && a.lng != null)
        .slice(0, 3)
        .map((a) => ({ id: a.id, lat: a.lat as number, lng: a.lng as number })),
    [addresses],
  );

  useEffect(() => {
    if (!universityId || priceable.length === 0) return;
    let alive = true;
    void Promise.all(
      priceable.map(async (p) => {
        try {
          const q = await api.rideRequests.estimate({
            type: 'scheduled',
            riders: 1,
            pickup_lat: p.lat,
            pickup_lng: p.lng,
            university_id: universityId,
          });
          return [p.id, q.pricing_source === 'zone_matrix' ? q.fare_fils : null] as const;
        } catch {
          return [p.id, null] as const;
        }
      }),
    ).then((pairs) => alive && setQuotes(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [priceable, universityId]);

  const snapTo = (toCollapsed: boolean) => {
    const maxY = Math.max(0, sheetH.current - PEEK);
    Animated.spring(sheetY, { toValue: toCollapsed ? maxY : 0, useNativeDriver: true, bounciness: 2, speed: 14 }).start();
    setCollapsed(toCollapsed);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => sheetY.stopAnimation((v) => { startY.current = v; }),
      onPanResponderMove: (_e, g) => {
        const maxY = Math.max(0, sheetH.current - PEEK);
        sheetY.setValue(Math.min(Math.max(0, startY.current + g.dy), maxY));
      },
      onPanResponderRelease: (_e, g) => {
        const maxY = Math.max(0, sheetH.current - PEEK);
        const current = Math.min(Math.max(0, startY.current + g.dy), maxY);
        snapTo(g.vy > 0.4 || (g.vy >= -0.4 && current > maxY / 2));
      },
    }),
  ).current;

  /*
   * SOS confirms, then sends the trip id AND the last coordinate we hold.
   *
   * Without the trip id the safety desk gets an alert and no car to look for; without
   * a coordinate they get a name and no place. The endpoint accepts both as optional,
   * which is why the client has to be the one that remembers to send them.
   */
  const triggerSos = async () => {
    const ok = await confirm({
      title: t('emergency.sosConfirmTitle'),
      message: t('emergency.sosConfirmMsg'),
      confirmLabel: t('emergency.sosConfirm'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!ok) return;

    setSosBusy(true);
    try {
      await api.emergency.triggerSos({
        trip_id: tripId,
        lat: myLoc?.lat ?? null,
        lng: myLoc?.lng ?? null,
      });
      toast.success(t('emergency.sosSent'));
    } catch {
      toast.error(t('emergency.sosFailed'));
    } finally {
      setSosBusy(false);
    }
  };

  /* ── Map points: every one of them a real coordinate ── */
  const points: MapPoint[] = [
    ...(captain ? [{ ...captain, kind: 'captain' as const, label: t('home.stepComing') }] : []),
    ...(myLoc ? [{ ...myLoc, kind: 'origin' as const, label: t('home.nearby') }] : []),
    ...(uniCoords && uniName ? [{ ...uniCoords, kind: 'destination' as const, label: uniName }] : []),
  ];
  const route = myLoc && uniCoords ? [captain ?? myLoc, myLoc, uniCoords] : undefined;

  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? '';
  const greeting = firstName ? `${t(`home.${greetingKey()}`)}، ${firstName}` : t(`home.${greetingKey()}`);
  const subtitle = [uniName, uni?.city].filter(Boolean).join(' · ');
  const live = Boolean(request || seat);

  return (
    <View style={s.root}>
      <View style={StyleSheet.absoluteFill}>
        <LiveMap points={points} route={route} legend={false} height={height} />
      </View>

      <SafeAreaView edges={['top']} style={s.topBar} pointerEvents="box-none">
        <View style={s.greetPill}>
          <View style={s.greetAvatar}>
            <Text role="titleSm" tone="inverse">{(firstName || 'ر').charAt(0)}</Text>
          </View>
          <View style={s.flexShrink}>
            <Text role="titleSm" tone="primary" numberOfLines={1}>{greeting}</Text>
            {subtitle ? <Text role="caption" tone="secondary" numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={s.topActions}>
          {/*
            The SOS button is present whenever a ride is, and it is the only control
            on this screen that is red. `SCREENS.md` calls for «زرّ استغاثة ظاهر
            دائماً» — always VISIBLE, meaning it does not live behind the sheet, so it
            sits on the map layer where nothing can cover it.
          */}
          {live ? (
            <Pressable
              onPress={() => void triggerSos()}
              disabled={sosBusy}
              accessibilityRole="button"
              accessibilityLabel={t('home.sos')}
              accessibilityState={{ disabled: sosBusy, busy: sosBusy }}
              style={({ pressed }) => [s.sosBtn, pressed && s.pressed]}
              hitSlop={6}
            >
              <Icon name="shield" size={22} color={theme.colors.onPrimary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.notifications')}
            style={s.circleBtn}
            hitSlop={6}
          >
            <Icon name="bell" size={22} color={theme.colors.primary} />
            {unread > 0 ? <View style={s.bellDot} /> : null}
          </Pressable>
        </View>
      </SafeAreaView>

      <Animated.View
        style={[s.sheet, { transform: [{ translateY: sheetY }], opacity: rise }]}
        onLayout={(e) => { sheetH.current = e.nativeEvent.layout.height; }}
      >
        <View {...pan.panHandlers} style={s.sheetHeader}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Pressable onPress={() => snapTo(!collapsed)} hitSlop={8} style={s.titleRow} accessibilityRole="button" accessibilityLabel={t(live ? 'home.liveTrip' : 'home.whereTo')}>
              <Text role="titleLg" tone="primary">{t(live ? 'home.liveTrip' : 'home.whereTo')}</Text>
              <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.muted} />
            </Pressable>
            {/*
              The assistant, moved out of the tab bar.

              It was the raised centre button — the most prominent control in the app,
              the slot every ride-hailing product reserves for its primary action. It
              is now a pill on the screen the student already opens, which is what
              phase 8.1 asked for and what the tab count required.
            */}
            <PressableScale onPress={() => router.push('/(app)/assistant')} style={s.aiChip} scaleTo={0.94}>
              <Icon name="sparkles" size={16} color={theme.colors.accent} />
              <Text role="label" tone="primary">{t('home.askAi')}</Text>
            </PressableScale>
          </View>
        </View>

        {live ? (
          <LivePanel
            theme={theme}
            request={request}
            seat={seat}
            captain={captain}
            myLoc={myLoc}
            onChat={() => tripId && router.push({ pathname: '/(app)/chat', params: { tripId, title: t('chat.withCaptain') } })}
          />
        ) : (
          <IdlePanel
            theme={theme}
            addresses={addresses}
            addressError={addressError}
            onRetryAddresses={() => void loadAddresses()}
            quotes={quotes}
            uniName={uniName}
            uniPriced={uniCoords != null}
            onSearch={() => router.push('/(app)/ride-request')}
            onPick={(a) =>
              router.push({
                pathname: '/(app)/ride-request',
                params: {
                  pickup_lat: String(a.lat),
                  pickup_lng: String(a.lng),
                  ...(universityId ? { university_id: universityId } : {}),
                },
              })
            }
          />
        )}
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IDLE — «إلى أين؟»
   ═══════════════════════════════════════════════════════════════════════════ */

function IdlePanel({
  theme,
  addresses,
  addressError,
  onRetryAddresses,
  quotes,
  uniName,
  uniPriced,
  onSearch,
  onPick,
}: {
  theme: AppTheme;
  addresses: SavedAddress[];
  addressError: boolean;
  onRetryAddresses: () => void;
  quotes: Record<string, number | null>;
  uniName: string | null;
  uniPriced: boolean;
  onSearch: () => void;
  onPick: (a: { lat: number; lng: number }) => void;
}) {
  const { t } = useI18n();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const rows = addresses.filter((a) => a.lat != null && a.lng != null).slice(0, 3);

  return (
    <View style={s.sheetBody}>
      <PressableScale onPress={onSearch} style={s.searchBtn} scaleTo={0.98}>
        <Icon name="search" size={22} color={theme.colors.muted} />
        <Text role="bodyLg" tone="secondary" style={s.flex}>{t('home.searchDestination')}</Text>
      </PressableScale>

      {addressError ? (
        <Pressable
          onPress={onRetryAddresses}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
          style={s.emptyRow}
        >
          <Text role="caption" tone="danger" align="center">{t('common.loadFailed')}</Text>
          <Text role="label" tone="primary" align="center">{t('common.retry')}</Text>
        </Pressable>
      ) : rows.length === 0 ? (
        <Pressable onPress={onSearch} accessibilityRole="button" accessibilityLabel={t('home.addDestination')} style={s.emptyRow}>
          <Text role="caption" tone="secondary" align="center">{t('home.noDestinations')}</Text>
        </Pressable>
      ) : (
        rows.map((a, i) => {
          const fare = quotes[a.id];
          const label = a.title?.trim() || t(`home.label${a.label === 'home' ? 'Home' : a.label === 'university' ? 'University' : a.label === 'work' ? 'Work' : 'Other'}`);
          return (
            <View key={a.id}>
              {i > 0 ? <View style={s.divider} /> : null}
              <PressableScale onPress={() => onPick({ lat: a.lat as number, lng: a.lng as number })} style={s.destRow} scaleTo={0.98}>
                <View style={s.destIcon}>
                  <Icon name={ADDRESS_ICON[a.label] ?? 'map-pin'} size={20} color={theme.colors.primary} />
                </View>
                <View style={s.flex}>
                  <Text role="titleSm" numberOfLines={1}>{label}</Text>
                  <Text role="caption" tone="secondary" numberOfLines={1}>{a.address_text}</Text>
                </View>
                {/* No number rather than a wrong one: `null` means this corridor has
                    no approved tariff row, and a dash there reads as "loading". */}
                {fare != null ? <Text role="titleSm" tone="primary">{formatJod(fare)}</Text> : null}
              </PressableScale>
            </View>
          );
        })
      )}

      {uniPriced && uniName ? (
        <>
          <View style={s.divider} />
          <PressableScale onPress={onSearch} style={s.destRow} scaleTo={0.98}>
            <View style={s.destIcon}>
              <Icon name="graduation-cap" size={20} color={theme.colors.primary} />
            </View>
            <View style={s.flex}>
              <Text role="titleSm" numberOfLines={1}>{uniName}</Text>
              <Text role="caption" tone="secondary" numberOfLines={1}>{t('home.labelUniversity')}</Text>
            </View>
            <Icon name="chevron-left" size={22} color={theme.colors.border} />
          </PressableScale>
        </>
      ) : null}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE — the same sheet, once a ride exists
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * The five stages, each read off a field that actually exists.
 *
 * The design (`docs/design/readme/student.png`) shows a five-step bar, and the
 * temptation with a five-step bar is to invent the middle. These are the real
 * transitions, in order, across the three records that describe one ride:
 *
 *   0 تم الطلب   — a `RideRequest` exists and is `pending`
 *   1 قُبلت      — it is `grouped`/`assigned`, or a car formed but has no captain yet
 *   2 الكابتن قادم — a `TripPassenger` row exists and is still `booked`
 *   3 في الطريع   — the passenger is `onboard`
 *   4 وصلت       — `dropped`, or the trip itself completed
 */
function stageOf(request: RideRequest | null, seat: TripPassenger | null): number {
  if (seat) {
    if (seat.status === 'dropped' || seat.trip?.status === 'completed') return 4;
    if (seat.status === 'onboard' || seat.trip?.status === 'started') return 3;
    return seat.trip?.status === 'pending_driver' ? 1 : 2;
  }
  return request?.status === 'pending' ? 0 : 1;
}

function LivePanel({
  theme,
  request,
  seat,
  captain,
  myLoc,
  onChat,
}: {
  theme: AppTheme;
  request: RideRequest | null;
  seat: TripPassenger | null;
  captain: { lat: number; lng: number } | null;
  myLoc: { lat: number; lng: number } | null;
  onChat: () => void;
}) {
  const { t } = useI18n();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const stage = stageOf(request, seat);
  const details = seat?.trip?.captain ?? null;
  const vehicle = details?.vehicle ?? null;

  const steps = [
    t('home.stepRequested'),
    t('home.stepAccepted'),
    t('home.stepComing'),
    t('home.stepOnboard'),
    t('home.stepArrived'),
  ];

  const away = captain && myLoc ? metresBetween(captain, myLoc) : null;
  const distance =
    away == null
      ? null
      : away >= METRES_PER_KM
        ? `${t('home.captainDistance')} ${(away / METRES_PER_KM).toFixed(1)} ${t('home.km')}`
        : `${t('home.captainDistance')} ${Math.round(away)} ${t('home.metre')}`;

  /* Only one code is live at a time, and which one is the passenger's status. */
  const code = seat?.status === 'onboard'
    ? { value: seat.dropoff_code, label: t('home.dropoffCode'), hint: t('home.dropoffCodeHint') }
    : { value: seat?.boarding_code ?? null, label: t('home.boardingCode'), hint: t('home.boardingCodeHint') };

  return (
    <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>
      <View style={s.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps.length, now: stage + 1 }}>
        {steps.map((label, i) => (
          <View key={label} style={s.step}>
            <View style={s.stepTrack}>
              {i > 0 ? <View style={[s.stepBar, i <= stage && s.stepBarOn]} /> : <View style={s.stepBarSpacer} />}
              <View style={[s.stepDot, i < stage && s.stepDotDone, i === stage && s.stepDotNow]} />
              {i < steps.length - 1 ? <View style={[s.stepBar, i < stage && s.stepBarOn]} /> : <View style={s.stepBarSpacer} />}
            </View>
            <Text role={i === stage ? 'label' : 'caption'} tone={i === stage ? 'primary' : 'secondary'} align="center" numberOfLines={2}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {details?.name ? (
        <View style={s.captainCard}>
          <View style={s.captainTop}>
            <View style={s.captainAvatar}>
              <Text role="titleMd" tone="inverse">{details.name.charAt(0)}</Text>
            </View>
            <View style={s.flex}>
              <Text role="titleSm" numberOfLines={1}>{details.name}</Text>
              <View style={s.captainMeta}>
                {vehicle ? (
                  <Text role="caption" tone="secondary" numberOfLines={1}>
                    {[vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                  </Text>
                ) : null}
                {/* `rating_count > 0` is the guard, but `rating_avg` is typed
                    `number` and comes off the wire — a null there would throw
                    INSIDE render, so `ErrorBoundary` would replace the whole home
                    screen with the crash panel while a captain was on the way. */}
                {details.rating_count > 0 && details.rating_avg != null ? (
                  <>
                    <Icon name="star" size={12} color={theme.colors.accent} />
                    <Text role="caption" tone="secondary">{Number(details.rating_avg).toFixed(1)}</Text>
                  </>
                ) : null}
              </View>
            </View>
            {vehicle?.plate_number ? (
              <View style={s.plate}>
                <Text role="titleSm" tone="primary">{vehicle.plate_number}</Text>
                <Text role="caption" tone="secondary">{t('home.plate')}</Text>
              </View>
            ) : null}
          </View>

          <View style={s.captainActions}>
            {/*
              `phone` is null once the trip ends — the resource stops sending it — so
              the call button disappears with the reason to press it. Chat stays.
            */}
            {details.phone ? (
              <Pressable
                onPress={() => void Linking.openURL(`tel:${details.phone}`)}
                accessibilityRole="button"
                accessibilityLabel={t('home.call')}
                style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
              >
                <Icon name="phone" size={16} color={theme.colors.primary} />
                <Text role="label" tone="primary">{t('home.call')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onChat}
              accessibilityRole="button"
              accessibilityLabel={t('home.message')}
              style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
            >
              <Icon name="message-circle" size={16} color={theme.colors.primary} />
              <Text role="label" tone="primary">{t('home.message')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* No captain yet is a real state, and it says which one it is. */
        <View style={s.waiting}>
          <Text role="bodyLg" tone="secondary" align="center">
            {request?.status === 'pending' ? t('home.grouping') : t('home.awaitingCaptain')}
          </Text>
        </View>
      )}

      {distance ? (
        <Text role="caption" tone="secondary" align="center">{distance}</Text>
      ) : seat ? (
        <Text role="caption" tone="secondary" align="center">{t('home.noCaptainLocation')}</Text>
      ) : null}

      {code.value ? (
        <View style={s.codeStrip}>
          <View style={s.codeLead}>
            <View style={s.codeDot} />
            <Text role="titleSm">{code.label}</Text>
            {/* Four digits, letter-spaced so a captain can read them off a screen at
                arm's length. Four, not six: `MatchingService::uniqueCode` draws
                `random_int(0, 9999)` and the boarding endpoint carries
                `throttle:trip-code` precisely because the space is that small. */}
            <Text role="titleLg" tone="primary" style={s.codeValue}>{code.value}</Text>
          </View>
          <Text role="caption" tone="secondary">{code.hint}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    flex: { flex: 1 },
    flexShrink: { flexShrink: 1 },
    pressed: { opacity: 0.75 },

    topBar: {
      position: 'absolute', top: 0, start: 0, end: 0,
      flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.sm,
    },
    greetPill: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, maxWidth: '68%',
      backgroundColor: t.colors.surface, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm,
      borderRadius: t.radius.pill, ...t.shadow.sm,
    },
    greetAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    topActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm },
    circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    sosBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.danger, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    bellDot: { position: 'absolute', top: 11, end: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.danger },

    sheet: {
      position: 'absolute', start: 0, end: 0, bottom: 92, maxHeight: '62%',
      backgroundColor: t.colors.surface, borderTopStartRadius: t.radius.sheet, borderTopEndRadius: t.radius.sheet,
      paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.lg,
      shadowColor: brand[900], shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 16,
    },
    sheetHeader: { paddingTop: t.spacing.sm, paddingBottom: t.spacing.sm },
    handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: t.colors.surfaceHighest, marginBottom: t.spacing.md },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm },
    titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
    aiChip: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
      backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.hairline,
      paddingHorizontal: t.spacing.md, paddingVertical: 6, borderRadius: t.radius.pill,
    },
    sheetBody: { paddingTop: t.spacing.sm, gap: t.spacing.md },

    /* Idle */
    searchBtn: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md,
      backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.hairline,
      borderRadius: t.radius.control, padding: t.spacing.md,
    },
    destRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.sm },
    destIcon: { width: 40, height: 40, borderRadius: t.radius.control, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: t.colors.hairline },
    emptyRow: { paddingVertical: t.spacing.lg },

    /* Live — progress */
    progress: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
    step: { flex: 1, alignItems: 'center', gap: 6 },
    stepTrack: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'stretch' },
    stepBar: { flex: 1, height: 3, backgroundColor: t.colors.surfaceHighest },
    stepBarOn: { backgroundColor: t.colors.success },
    stepBarSpacer: { flex: 1, height: 3 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.surfaceHighest },
    stepDotDone: { backgroundColor: t.colors.success },
    stepDotNow: { backgroundColor: t.colors.primary, width: 16, height: 16, borderRadius: 8 },

    /* Live — captain */
    captainCard: { borderWidth: 1, borderColor: t.colors.hairline, borderRadius: t.radius.card, padding: t.spacing.md, gap: t.spacing.md },
    captainTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    captainAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    captainMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 2 },
    plate: { alignItems: 'center' },
    captainActions: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    ghostBtn: {
      flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.control, paddingVertical: t.spacing.sm,
    },
    waiting: { paddingVertical: t.spacing.md },

    /* Live — code */
    codeStrip: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm,
      backgroundColor: t.colors.warningSoft, borderRadius: t.radius.control, padding: t.spacing.md,
    },
    codeLead: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, flexShrink: 1 },
    codeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.warning },
    codeValue: { letterSpacing: 4 },
  });
