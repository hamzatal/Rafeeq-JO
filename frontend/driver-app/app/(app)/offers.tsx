import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bareJod, formatJod, formatJodSigned } from '@rafeeq/shared';
import type { Trip } from '@rafeeq/shared';
import { Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LiveMap,
  SkeletonList,
  Text,
  useTheme,
  type AppTheme,
  type MapPoint,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   العرض الوارد — design screen 27.

   ── What an offer screen has to do that this one did not ───────────────────

   An offer is a decision under time pressure, taken by someone who is DRIVING. The
   old screen was a scrolling list of cards with an «قبول العرض» button on each and
   no time in it anywhere: no countdown, no expiry, no way to tell a fresh offer from
   one the passenger gave up on ten minutes ago. `push.ts` even described
   `ride_offer` as "a captain's countdown screen", which it was not.

   Three things changed:

     • **The first offer is full-screen**, with the route on a map above it. A captain
       glancing at a phone in a cradle cannot read a list.
     • **A countdown**, from `OFFER_WINDOW_SECONDS`. When it reaches zero the offer is
       marked expired in place rather than vanishing — an offer that disappears while
       you are reaching for it reads as a bug.
     • **A vibration when it arrives**, because the phone is in a cradle and the
       captain is watching the road. `Vibration` from react-native, not
       `expo-haptics`: haptics is not a dependency of this app, and a native module
       that cannot be verified here is not worth the pattern fidelity.

   ── The hero number is the NET ─────────────────────────────────────────────

   Not the fare. The captain's decision is «is this worth my next 20 minutes», and
   the fare is not that number — the fare minus our commission is. The old screen had
   all three lines at nearly the same weight, so the biggest number on the card was
   the one that was not the answer.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * How long a captain has to answer.
 *
 * A guess would be worse than nothing, so this is a CLIENT-side display window, not
 * an authority: expiry is decided by the backend when it reassigns the request. What
 * this buys is honesty on screen — a captain seeing 12 seconds knows to decide now,
 * and a captain seeing «انتهت المهلة» knows why accepting just failed.
 */
const OFFER_WINDOW_SECONDS = 60;

/** A short double-buzz: distinguishable from a message without being alarming. */
const OFFER_PATTERN = [0, 220, 120, 220];

export default function Offers() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [offers, setOffers] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [remaining, setRemaining] = useState(OFFER_WINDOW_SECONDS);
  const [ignored, setIgnored] = useState<string[]>([]);
  const announced = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setOffers(await api.driverTrips.offers());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = offers.filter((o) => !ignored.includes(o.id));
  const lead = visible[0] ?? null;
  const rest = visible.slice(1);

  /*
   * Restart the countdown when the offer on top CHANGES, not on every render.
   *
   * Keyed on the id: re-running this on each render would reset the clock to 60 every
   * second, which is the classic way a countdown ends up never counting.
   */
  useEffect(() => {
    if (!lead) return;
    setRemaining(OFFER_WINDOW_SECONDS);

    if (announced.current !== lead.id) {
      announced.current = lead.id;
      Vibration.vibrate(OFFER_PATTERN);
    }

    const timer = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);

    return () => clearInterval(timer);
  }, [lead?.id]);

  const accept = async (tripId: string) => {
    setMsg(null);
    setBusy(tripId);
    try {
      await api.driverTrips.acceptOffer(tripId);
      router.replace(`/(app)/trip/${tripId}`);
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'), ok: false });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const expired = remaining === 0;
  const mapPoints = useMemo<MapPoint[]>(() => {
    const points: MapPoint[] = [];
    for (const p of lead?.passengers ?? []) {
      if (p.pickup_lat != null && p.pickup_lng != null) {
        points.push({ lat: p.pickup_lat, lng: p.pickup_lng, kind: 'pickup', label: p.student_name ?? t('driver.passengerLabel') });
      }
    }

    return points;
  }, [lead, t]);

  const pricing = lead?.pricing;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {msg ? <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} /> : null}

        {loading ? (
          <SkeletonList rows={3} />
        ) : loadError ? (
          <ErrorState title={t('common.error')} message={t('common.loadFailed')} retryLabel={t('common.retry')} onRetry={() => void load()} />
        ) : !lead ? (
          <EmptyState icon="inbox" title={t('driver.noOffers')} />
        ) : (
          <>
            {/* The route, so the decision is about a place and not a row of text. */}
            {mapPoints.length > 0 ? (
              <View style={s.mapWrap}>
                <LiveMap points={mapPoints} route={mapPoints} height={190} legend={false} />
              </View>
            ) : null}

            <View style={[s.lead, expired && s.leadExpired]}>
              <View style={s.leadHead}>
                <View style={s.badgeRow}>
                  <View style={[s.dot, { backgroundColor: expired ? theme.colors.muted : theme.colors.success }]} />
                  <Text role="label" tone={expired ? 'muted' : 'success'}>
                    {expired ? t('driver.offerExpired') : t('driver.offers')}
                  </Text>
                </View>
                {/* The countdown. An offer with no clock on it is not an offer. */}
                <View style={[s.timer, expired && s.timerExpired]}>
                  <Icon name="clock" size={13} color={expired ? theme.colors.muted : theme.colors.primary} />
                  <Text role="label" tone={expired ? 'muted' : 'primary'}>
                    {expired ? '0' : remaining} {t('driver.offerExpiresIn')}
                  </Text>
                </View>
              </View>

              {/* THE number: net after commission, because that is the decision. */}
              {pricing ? (
                <View style={s.heroWrap}>
                  <Text role="displayLg" tone="primary" align="center">
                    {bareJod(pricing.expected_captain_earnings_fils)}
                  </Text>
                  <Text role="label" tone="secondary" align="center">{t('driver.yourNetEarnings')}</Text>
                  <Text role="caption" tone="muted" align="center">
                    {t('driver.farePerSeat')} {formatJod(pricing.fare_fils)} · {t('driver.platformCommission')}{' '}
                    {formatJodSigned(-pricing.commission_fils)}
                  </Text>
                </View>
              ) : null}

              <View style={s.factRow}>
                <View style={s.fact}>
                  <Text role="titleSm" align="center">{lead.booked_count ?? 0}/{lead.capacity}</Text>
                  <Text role="caption" tone="secondary" align="center">{t('driver.seats')}</Text>
                </View>
                <View style={s.factDivider} />
                <View style={s.fact}>
                  <Text role="titleSm" align="center" numberOfLines={1}>
                    {lead.scheduled_at ? new Date(lead.scheduled_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </Text>
                  <Text role="caption" tone="secondary" align="center">{t('driver.tripsSection')}</Text>
                </View>
              </View>

              <Text role="titleSm" align="center" numberOfLines={2} style={s.route}>
                {lead.route?.name ?? t('driver.pooledTrip')}
              </Text>

              {/*
                Accept and Ignore, both 54pt. «تجاهل» exists because the alternative was
                a captain leaving the screen to decline, which reads as an outage to the
                matcher and delays the next captain being asked.
              */}
              <View style={s.actions}>
                <Button
                  title={t('driver.acceptOffer')}
                  onPress={() => void accept(lead.id)}
                  loading={busy === lead.id}
                  disabled={expired}
                  style={s.accept}
                />
                <Pressable
                  onPress={() => setIgnored((prev) => [...prev, lead.id])}
                  accessibilityRole="button"
                  accessibilityLabel={t('driver.ignoreOffer')}
                  style={({ pressed }) => [s.ignore, pressed && s.pressed]}
                >
                  <Text role="titleSm" tone="secondary" align="center">{t('driver.ignoreOffer')}</Text>
                </Pressable>
              </View>
            </View>

            {/* Anything else waiting, as a compact queue below the fold. */}
            {rest.length > 0 ? (
              <>
                <Text role="titleSm" tone="secondary" style={s.section}>{t('driver.tripsSection')}</Text>
                {rest.map((trip) => (
                  <Card key={trip.id} style={s.cardGap}>
                    <View style={s.rowBetween}>
                      <Text role="titleSm" numberOfLines={1} style={s.flex}>{trip.route?.name ?? t('driver.pooledTrip')}</Text>
                      <Text role="titleSm" tone="primary">
                        {trip.pricing ? bareJod(trip.pricing.expected_captain_earnings_fils) : '—'}
                      </Text>
                    </View>
                    <Text role="caption" tone="secondary">
                      {trip.booked_count ?? 0}/{trip.capacity} {t('driver.seats')}
                      {trip.scheduled_at ? ` · ${new Date(trip.scheduled_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </Text>
                  </Card>
                ))}
              </>
            ) : null}
          </>
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
    cardGap: { marginBottom: t.spacing.sm },
    section: { marginTop: t.spacing.lg, marginBottom: t.spacing.sm },
    pressed: { opacity: 0.85 },

    mapWrap: { borderRadius: t.radius.sheet, overflow: 'hidden', marginBottom: t.spacing.md, borderWidth: 1, borderColor: t.colors.hairline },

    lead: { backgroundColor: t.colors.surface, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.accent, padding: t.spacing.lg, gap: t.spacing.md, ...t.shadow.md },
    leadExpired: { borderColor: t.colors.border, opacity: 0.7 },
    leadHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    badgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    timer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: t.colors.primarySoft, borderRadius: t.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    timerExpired: { backgroundColor: t.colors.surfaceAlt },

    heroWrap: { alignItems: 'center', gap: 2 },
    factRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.control, paddingVertical: t.spacing.md },
    fact: { flex: 1, alignItems: 'center', gap: 2 },
    factDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: t.colors.border },
    route: { paddingHorizontal: t.spacing.sm },

    actions: { gap: t.spacing.sm },
    accept: { minHeight: 54 },
    ignore: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.border },

    rowBetween: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm },
  });
