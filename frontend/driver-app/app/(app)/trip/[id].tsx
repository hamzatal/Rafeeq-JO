import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TRIP_CODE_LENGTH, type Trip, type TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  ListState,
  LiveMap,
  SectionTitle,
  Text,
  getCurrentLocation,
  listLabels,
  statusFromError,
  useTheme,
  type AppTheme,
  type ListStatus,
  type MapPoint,
} from '@rafeeq/ui';
import { useI18n } from '../../../src/i18n';
import { api } from '../../../src/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   وضع الرحلة — design screen 28.

   ── One step at a time, because the captain is driving ─────────────────────

   The old screen rendered EVERY control the trip status allowed, all at once: while
   started, it showed a boarding-code card AND a drop-off-code card AND an end-trip
   button, stacked. Two identical-looking six-box inputs one above the other, and the
   only thing distinguishing them was a heading — asked of someone holding a steering
   wheel.

   So there is one action now, chosen from the passengers' state:

     nobody boarded yet  → boarding code
     someone onboard     → drop-off code
     everyone dropped    → end trip

   ── 54pt targets, and no swipe ─────────────────────────────────────────────

   Every control is at least 54pt tall. There was no swipe gesture to remove (the
   roadmap's «بلا تمرير» was already true) and none is being added: a swipe is a
   gesture you cannot see, and a captain glancing down needs a target, not a hint.

   ── Six cells, from one constant ───────────────────────────────────────────

   The code input had `maxLength={6}`, `placeholder="----"` (four dashes) and a guard
   of `length < 4`. Three opinions about one field, in one line, twice. It reads
   `TRIP_CODE_LENGTH` now, which is the same constant the auth screens use and matches
   `TripCode::LENGTH` on the backend.
   ═══════════════════════════════════════════════════════════════════════════ */

type Step = 'start' | 'boarding' | 'dropoff' | 'end' | 'done';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState<TripPassenger[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [status, setStatus] = useState<ListStatus>({ kind: 'loading' });
  const codeRef = useRef<TextInput>(null);

  /*
   * No `catch` at all, once. A failed load left `passengers` empty and the screen told
   * the captain «لا ركّاب» — on the trip he is currently driving.
   */
  const load = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      const [tr, p] = await Promise.all([api.driverTrips.show(id), api.driverTrips.passengers(id)]);
      setTrip(tr);
      setPassengers(p);
      setStatus({ kind: 'ready' });
    } catch (e) {
      setStatus(statusFromError(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // While the trip is in progress, broadcast the captain's position so riders can
  // track it (feeds GET /trips/{id}/location). Best-effort and safe.
  useEffect(() => {
    if (trip?.status !== 'started') return;
    const ping = async () => {
      const loc = await getCurrentLocation();
      if (!loc) return;
      try {
        await api.driverTrips.pushLocation(id, loc.lat, loc.lng);
      } catch {
        /* best-effort */
      }
    };
    void ping();
    const timer = setInterval(() => void ping(), 12000);

    return () => clearInterval(timer);
  }, [trip?.status, id]);

  const active = passengers.filter((p) => p.status !== 'cancelled');
  const waiting = active.filter((p) => p.status === 'booked');
  const onboard = active.filter((p) => p.status === 'onboard');

  /** The ONE thing to do next. */
  const step: Step = useMemo(() => {
    if (!trip) return 'start';
    if (trip.status === 'scheduled') return 'start';
    if (trip.status !== 'started') return 'done';
    if (waiting.length > 0) return 'boarding';
    if (onboard.length > 0) return 'dropoff';

    return 'end';
  }, [trip, waiting.length, onboard.length]);

  const mapPoints = useMemo<MapPoint[]>(
    () =>
      active
        .filter((p) => p.pickup_lat != null && p.pickup_lng != null)
        .map((p) => ({
          lat: p.pickup_lat as number,
          lng: p.pickup_lng as number,
          label: p.student_name ?? t('driver.passengerLabel'),
          kind: 'pickup' as const,
        })),
    [active, t],
  );

  const act = async (fn: () => Promise<unknown>, okText: string) => {
    setMsg(null);
    setBusy(true);
    try {
      await fn();
      setMsg({ text: okText, ok: true });
      setCode('');
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const submitCode = () => {
    const value = code.trim();
    if (value.length !== TRIP_CODE_LENGTH) return;
    if (step === 'boarding') return act(() => api.driverTrips.confirmBoarding(id, value), t('driver.boardingConfirmed'));

    return act(() => api.driverTrips.confirmDropoff(id, value), t('driver.dropoffConfirmed'));
  };

  if (status.kind !== 'ready' && !trip) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ListState status={status} onRetry={load} labels={listLabels(t)} />
      </SafeAreaView>
    );
  }

  const askingCode = step === 'boarding' || step === 'dropoff';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.back')}
            style={s.headerBtn}
          >
            <Icon name="chevron-right" size={24} color={theme.colors.primary} />
          </Pressable>
          <View style={s.headerText}>
            <Text role="titleMd" tone="primary" numberOfLines={1}>{trip?.route?.name ?? t('driver.pooledTrip')}</Text>
            <Text role="caption" tone="secondary">
              {trip?.scheduled_at ? new Date(trip.scheduled_at).toLocaleString(locale) : ''}
            </Text>
          </View>
          <Badge
            label={trip?.status_label ?? ''}
            tone={trip?.status === 'completed' ? 'success' : trip?.status === 'cancelled' ? 'danger' : 'primary'}
          />
        </View>

        {mapPoints.length > 0 ? (
          <View style={s.mapWrap}>
            <LiveMap points={mapPoints} route={mapPoints} height={220} legend={false} />
          </View>
        ) : null}

        {msg ? <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} /> : null}

        {/* ── The one action ──────────────────────────────────────────────── */}
        {step === 'start' ? (
          <View style={s.stepCard}>
            <Text role="titleMd" align="center">{t('driver.startTrip')}</Text>
            <Text role="body" tone="secondary" align="center">
              {active.length} {t('driver.passengers')}
            </Text>
            <Button title={t('driver.startTrip')} onPress={() => act(() => api.driverTrips.start(id), t('driver.tripStarted'))} loading={busy} style={s.tall} />
            <Pressable
              onPress={() => act(() => api.driverTrips.cancel(id), t('driver.tripCancelled'))}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
            >
              <Text role="titleSm" tone="danger" align="center">{t('common.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}

        {askingCode ? (
          <View style={s.stepCard}>
            <Text role="titleMd" align="center">
              {t(step === 'boarding' ? 'driver.enterBoardingCodeShort' : 'driver.enterDropoffCodeShort')}
            </Text>
            <Text role="body" tone="secondary" align="center">
              {step === 'boarding'
                ? `${waiting.length} ${t('driver.passengers')}`
                : `${onboard.length} ${t('driver.passengers')}`}
            </Text>

            {/*
              Six cells over one hidden input.
              A single wide `Input` with `letterSpacing: 6` was ambiguous about how many
              digits it wanted, which is how the placeholder came to promise four while
              `maxLength` allowed six.
            */}
            <Pressable
              onPress={() => codeRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel={t(step === 'boarding' ? 'driver.enterBoardingCodeShort' : 'driver.enterDropoffCodeShort')}
              style={s.cells}
            >
              {Array.from({ length: TRIP_CODE_LENGTH }).map((_, i) => (
                <View key={i} style={[s.cell, i === code.length && s.cellActive]}>
                  <Text role="titleLg" align="center">{code[i] ?? ''}</Text>
                </View>
              ))}
            </Pressable>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, TRIP_CODE_LENGTH))}
              keyboardType="number-pad"
              maxLength={TRIP_CODE_LENGTH}
              autoFocus
              style={s.hiddenInput}
              accessibilityLabel={t('auth.code')}
            />

            <Text role="caption" tone="muted" align="center">
              {t('driver.codeDigitsNote').replace('{n}', String(TRIP_CODE_LENGTH))}
            </Text>

            <Button
              title={t(step === 'boarding' ? 'common.confirm' : 'driver.confirmDropoffAndEnd')}
              onPress={submitCode}
              loading={busy}
              disabled={code.trim().length !== TRIP_CODE_LENGTH}
              style={s.tall}
            />
            <Pressable
              onPress={() => router.push('/(app)/chat')}
              accessibilityRole="button"
              accessibilityLabel={t('driver.reportProblem')}
              style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
            >
              <Text role="titleSm" tone="secondary" align="center">{t('driver.reportProblem')}</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'end' ? (
          <View style={s.stepCard}>
            <Text role="titleMd" align="center">{t('driver.endTrip')}</Text>
            <Text role="body" tone="secondary" align="center">{t('driver.dropoffConfirmed')}</Text>
            <Button title={t('driver.endTrip')} onPress={() => act(() => api.driverTrips.end(id), t('driver.tripEnded'))} loading={busy} style={s.tall} />
          </View>
        ) : null}

        {/* ── Who is in the car ───────────────────────────────────────────── */}
        <SectionTitle title={`${t('driver.passengers')} (${active.length})`} />
        {status.kind !== 'ready' ? (
          <ListState status={status} onRetry={load} labels={listLabels(t)} />
        ) : active.length === 0 ? (
          <EmptyState icon="users" title={t('driver.noPassengers')} />
        ) : (
          active.map((p) => (
            <Card key={p.id} style={s.paxCard}>
              <View style={s.paxRow}>
                <View style={s.paxIcon}>
                  <Icon
                    name={p.status === 'dropped' ? 'circle-check' : p.status === 'onboard' ? 'navigation' : 'clock'}
                    size={18}
                    color={p.status === 'booked' ? theme.colors.textSecondary : theme.colors.accent}
                  />
                </View>
                <View style={s.flex}>
                  <Text role="titleSm" numberOfLines={1}>{p.student_name ?? t('driver.passengerLabel')}</Text>
                  <Text role="caption" tone="secondary">{p.status_label}</Text>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/chat',
                      params: { tripId: id, studentUserId: p.student_id, title: t('chat.withStudent') },
                    })
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.openChat')}
                  style={s.chatBtn}
                >
                  <Icon name="message-circle" size={20} color={theme.colors.primary} />
                </Pressable>
              </View>
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
    flex: { flex: 1 },
    pressed: { opacity: 0.85 },

    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing.md },
    headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },

    mapWrap: { borderRadius: t.radius.sheet, overflow: 'hidden', marginBottom: t.spacing.md, borderWidth: 1, borderColor: t.colors.hairline },

    stepCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.accent, padding: t.spacing.lg, gap: t.spacing.md, marginBottom: t.spacing.base, ...t.shadow.md },
    /* 54pt: the roadmap's target, and the smallest thing a driving thumb finds. */
    tall: { minHeight: 54 },
    secondaryBtn: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.border },

    cells: { flexDirection: 'row-reverse', justifyContent: 'center', gap: t.spacing.sm },
    cell: { width: 46, height: 56, borderRadius: t.radius.control, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    cellActive: { borderColor: t.colors.primary, backgroundColor: t.colors.surface },
    /* Off-screen rather than `display: none`: a hidden input still has to be
       focusable for the keyboard to open when the cells are tapped. */
    hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },

    paxCard: { marginBottom: t.spacing.sm },
    paxRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    paxIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    chatBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  });
