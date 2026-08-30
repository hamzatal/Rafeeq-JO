import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatJod } from '@rafeeq/shared';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { FareQuote, PaymentMethod, RideDirection, University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Banner,
  getCurrentLocation,
  Icon,
  LiveMap,
  useTheme,
  useToast,
  Text,
  type AppTheme,
  type IconName,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   TWO PRODUCTS, both with an approved price.

   ── What this replaced ─────────────────────────────────────────────────────

   Three "vehicle classes" — «رفيق اقتصادي» · «رفيق عائلي» · «رفيق بلس» — defined
   in a local array with hardcoded seat counts and hardcoded ETAs of 5, 8 and 4
   minutes. Nothing computed those ETAs. There is no captain-proximity endpoint in
   this API, so the numbers were not stale, they were invented.

   Worse, the prices were not distinct either. The screen called `/estimate` three
   times with different `capacity` values, and the tariff does not vary by capacity:
   `economical` and `family` returned the SAME fare. A rider was choosing between
   two identical prices on the strength of a fabricated wait time, and paying for a
   "family" car that was the same car.

   ── What the tariff actually holds ─────────────────────────────────────────

   One approved row per (zone × university) with TWO prices: `fare_fils` for a seat
   and `solo_fare_fils` for the whole car. That is the product, and phase 5 built it
   on purpose — showing both is what makes the pooling wait acceptable, because the
   alternative has a printed price beside it.

   Express is a MODIFIER on either, not a third product: a flat surcharge that skips
   the aggregation window.

   ── One estimate call, not three ───────────────────────────────────────────

   Both prices come back in the same response, so the screen makes one request per
   corridor instead of three. `solo_fare_fils` is nullable — a corridor can be
   approved for pooling and not for solo — and that case says so rather than
   rendering a dash that reads as a loading failure.
   ═══════════════════════════════════════════════════════════════════════════ */

type Product = 'shared' | 'solo';

export default function RideRequestScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const router = useRouter();

  /*
   * A destination tapped on the home sheet arrives as route params.
   *
   * The home screen shows the student's saved addresses with an ANNOUNCED price
   * beside each one, so a tap is a decision already made. Without these params this
   * screen would re-derive the pickup from GPS and quote a different corridor than
   * the one whose price the student just read — the same class of bug as the old
   * smart-suggestion chips, which computed a destination server-side and then
   * navigated here without it, making every chip identical.
   */
  const params = useLocalSearchParams<{ pickup_lat?: string; pickup_lng?: string; university_id?: string }>();
  const paramLat = Number(params.pickup_lat);
  const paramLng = Number(params.pickup_lng);
  const hasParamPickup = Number.isFinite(paramLat) && Number.isFinite(paramLng) && params.pickup_lat !== undefined;

  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [direction, setDirection] = useState<RideDirection>('to_university');
  const [product, setProduct] = useState<Product>('shared');
  const [express, setExpress] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>('wallet');
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyMyLocation = useCallback(async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setLat(loc.lat);
      setLng(loc.lng);
    }
  }, []);

  useEffect(() => {
    api.catalog
      .listUniversities()
      .then((unis) => {
        setUniversities(unis);
        setUniversityId((current) => current ?? params.university_id ?? unis[0]?.id ?? null);
      })
      .catch(() => setError(t('common.loadFailed')));

    /* A pickup handed over from home wins over GPS: it is what the quoted price
       was computed against. Otherwise fall back to where the phone is. */
    if (hasParamPickup) {
      setLat(paramLat);
      setLng(paramLng);
    } else {
      void applyMyLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * A fare is a property of the (pickup zone × university) pair, so it cannot be
   * asked for until both are known — and the express surcharge changes it, so the
   * quote is refreshed when that toggles too.
   */
  const estimate = useCallback(async () => {
    if (lat == null || lng == null || !universityId) return;

    setQuoting(true);
    setError(null);
    try {
      setQuote(
        await api.rideRequests.estimate({
          type: express ? 'express' : 'scheduled',
          riders: 1,
          pickup_lat: lat,
          pickup_lng: lng,
          university_id: universityId,
        }),
      );
    } catch (e) {
      setQuote(null);
      setError(e instanceof RafeeqApiError ? e.message : t('common.loadFailed'));
    } finally {
      setQuoting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, universityId, express]);

  useEffect(() => {
    void estimate();
  }, [estimate]);

  const priced = quote?.pricing_source === 'zone_matrix' ? quote : null;
  const sharedFare = priced?.fare_fils ?? null;
  const soloFare = priced?.solo_fare_fils ?? null;

  /*
   * The selection cannot point at a product this corridor does not sell.
   *
   * `solo_fare_fils` is nullable, so a rider who picked "private" on one corridor
   * and then changed university could otherwise submit a request the API is about to
   * refuse with `SOLO_NOT_PRICED`.
   */
  useEffect(() => {
    if (product === 'solo' && priced && soloFare == null) setProduct('shared');
  }, [product, priced, soloFare]);

  const cycleUniversity = () => {
    if (universities.length < 2) return;
    const i = universities.findIndex((u) => u.id === universityId);
    setUniversityId(universities[(i + 1) % universities.length].id);
  };

  const submit = async () => {
    if (!universityId) return toast.error(t('rideRequest.pickUniversity'));
    if (lat == null || lng == null) return toast.error(t('rideRequest.locationFailed'));

    setBusy(true);
    try {
      await api.rideRequests.create({
        university_id: universityId,
        pickup_lat: lat,
        pickup_lng: lng,
        desired_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        type: express ? 'express' : 'scheduled',
        direction,
        /* Both of these were previously unsendable — see CreateRideRequestInput. */
        is_solo: product === 'solo',
        payment_method: payment,
      });
      toast.success(t('rideRequest.created'));
      router.push('/(app)/trips');
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const uni = universities.find((u) => u.id === universityId);
  const uniName = uni ? (locale === 'ar' ? uni.name_ar : uni.name_en) : '—';
  const hasPickup = lat != null && lng != null;
  const hasDest = Boolean(uni?.lat != null && uni?.lng != null);
  const points = [
    ...(hasPickup ? [{ lat: lat!, lng: lng!, kind: 'origin' as const, label: t('rideRequest.pickup') }] : []),
    ...(hasDest ? [{ lat: uni!.lat!, lng: uni!.lng!, kind: 'destination' as const, label: uniName }] : []),
  ];
  const route = hasPickup && hasDest ? [{ lat: lat!, lng: lng! }, { lat: uni!.lat!, lng: uni!.lng! }] : undefined;
  const selectedFare = product === 'solo' ? soloFare : sharedFare;
  const dirLabel = direction === 'to_university' ? t('rideRequest.toUniversity') : t('rideRequest.fromUniversity');

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.back')}
            hitSlop={8}
            style={s.backBtn}
          >
            <Icon name="arrow-right" size={24} color={theme.colors.textSecondary} />
          </Pressable>
          <Text role="titleLg" tone="primary" align="center">
            {t('common.appName')}
          </Text>
          <View style={s.backBtn} />
        </View>
      </SafeAreaView>

      <View style={s.mapArea}>
        <LiveMap points={points} route={route} height={300} legend={false} onPick={(p) => { setLat(p.lat); setLng(p.lng); }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.swapDirection')}
          onPress={() => setDirection((d) => (d === 'to_university' ? 'from_university' : 'to_university'))}
          style={[s.mapFab, { right: 16 }]}
          hitSlop={8}
        >
          <Icon name="arrow-up-down" size={20} color={theme.colors.primary} />
        </Pressable>
        <Pressable
          onPress={applyMyLocation}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.useMyLocation')}
          style={[s.mapFab, { right: 68 }]}
          hitSlop={8}
        >
          <Icon name="locate-fixed" size={20} color={theme.colors.accent} />
        </Pressable>
      </View>

      <View style={s.sheet}>
        <View style={s.handle} />
        <ScrollView contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          <Text role="titleLg">{t('rideRequest.chooseProduct')}</Text>

          <Banner message={error} variant="error" />

          {/*
            Say it plainly when we cannot serve this corridor yet.
            A price card reading "—" looks like a bug, so the rider retries instead of
            learning that their area is not open.
          */}
          {quote?.pricing_source === 'unpriced_corridor' ? (
            <View style={s.notice}>
              <Icon name="info" size={18} color={theme.colors.accent} />
              <Text role="body" tone="secondary" style={s.flex}>
                {t('rideRequest.notCovered')}
              </Text>
            </View>
          ) : null}

          <View style={s.products}>
            <ProductCard
              theme={theme}
              icon="users"
              title={t('rideRequest.shared')}
              hint={t('rideRequest.sharedHint')}
              note={t('rideRequest.sharedWait')}
              unit={t('rideRequest.perSeat')}
              fare={sharedFare}
              loading={quoting}
              selected={product === 'shared'}
              onPress={() => setProduct('shared')}
            />
            <ProductCard
              theme={theme}
              icon="car"
              title={t('rideRequest.solo')}
              hint={t('rideRequest.soloHint')}
              note={t('rideRequest.soloNoWait')}
              unit={t('rideRequest.wholeCar')}
              fare={soloFare}
              loading={quoting}
              selected={product === 'solo'}
              /* Not orderable on a corridor with no approved whole-car price. */
              disabled={priced != null && soloFare == null}
              disabledReason={t('rideRequest.soloUnavailable')}
              onPress={() => setProduct('solo')}
            />
          </View>

          {/* Express is a modifier on whichever product is selected, not a third one. */}
          <Pressable
            onPress={() => setExpress((v) => !v)}
            accessibilityRole="switch"
            accessibilityLabel={t('rideRequest.express')}
            accessibilityState={{ checked: express }}
            style={[s.row, express && s.rowOn]}
          >
            <View style={s.rowLeft}>
              <View style={[s.rowIcon, express && s.rowIconOn]}>
                <Icon name="zap" size={20} color={express ? theme.colors.onPrimary : theme.colors.primary} />
              </View>
              <View style={s.flex}>
                <Text role="titleSm">{t('rideRequest.express')}</Text>
                <Text role="caption" tone="secondary">
                  {t('rideRequest.expressHint')}
                </Text>
              </View>
            </View>
            <View style={[s.check, express && s.checkOn]}>{express ? <Icon name="check" size={14} color={theme.colors.onPrimary} /> : null}</View>
          </Pressable>

          <SelectorRow theme={theme} icon="map-pin" label={dirLabel} sub={uniName} onPress={cycleUniversity} />

          {/*
            The payment choice, which this screen could not make.

            It was a `SelectorRow` with `onPress={() => {}}` — a dead control on the
            payment step. The backend has validated `payment_method` since the endpoint
            existed, so every request silently defaulted to `wallet` and the captain saw
            the default instead of the rider's choice.
          */}
          <Text role="titleSm" style={s.groupLabel}>
            {t('rideRequest.paymentMethod')}
          </Text>
          <SelectorRow
            theme={theme}
            icon="wallet"
            label={t('rideRequest.walletPay')}
            sub={t('rideRequest.walletHint')}
            selected={payment === 'wallet'}
            onPress={() => setPayment('wallet')}
          />
          <SelectorRow
            theme={theme}
            icon="banknote"
            label={t('rideRequest.cashPay')}
            sub={t('rideRequest.cashHint')}
            selected={payment === 'cash'}
            onPress={() => setPayment('cash')}
          />
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            onPress={submit}
            disabled={busy || selectedFare == null}
            accessibilityRole="button"
            accessibilityLabel={t('rideRequest.confirmRide')}
            accessibilityState={{ disabled: busy || selectedFare == null, busy }}
            style={({ pressed }) => [s.confirm, (busy || selectedFare == null) && s.confirmOff, pressed && s.pressed]}
          >
            <Text role="titleMd" tone="inverse" align="center">
              {busy ? t('common.loading') : t('rideRequest.confirmRide')}
            </Text>
            {selectedFare != null ? (
              <Text role="titleMd" tone="inverse">
                {formatJod(selectedFare)}
              </Text>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ProductCard({
  theme,
  icon,
  title,
  hint,
  note,
  unit,
  fare,
  loading,
  selected,
  disabled = false,
  disabledReason,
  onPress,
}: {
  theme: AppTheme;
  icon: IconName;
  title: string;
  hint: string;
  note: string;
  unit: string;
  fare: number | null;
  loading: boolean;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onPress: () => void;
}) {
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${hint}`}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [s.card, selected && s.cardOn, disabled && s.cardOff, pressed && !disabled && s.pressed]}
    >
      <View style={[s.cardIcon, selected && s.cardIconOn]}>
        <Icon name={icon} size={26} color={selected ? theme.colors.onPrimary : theme.colors.primary} />
      </View>

      <View style={s.flex}>
        <Text role="titleMd">{title}</Text>
        <Text role="caption" tone="secondary">
          {hint}
        </Text>
        <Text role="caption" tone={selected ? 'primary' : 'muted'} style={s.note}>
          {disabled ? disabledReason : note}
        </Text>
      </View>

      <View style={s.priceCol}>
        {/*
          A dash, never a zero, and never a plausible-looking number. A formatted
          zero reads as "free" — which on an unpriced corridor is a lie, not a gap.
        */}
        <Text role="titleLg" tone={disabled ? 'muted' : 'primary'} align="left">
          {loading ? '…' : fare == null ? '—' : formatJod(fare)}
        </Text>
        <Text role="caption" tone="muted" align="left">
          {unit}
        </Text>
      </View>
    </Pressable>
  );
}

function SelectorRow({
  theme,
  icon,
  label,
  sub,
  onPress,
  selected,
}: {
  theme: AppTheme;
  icon: IconName;
  label: string;
  sub: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  const isChoice = selected !== undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={isChoice ? 'radio' : 'button'}
      accessibilityLabel={label}
      accessibilityState={isChoice ? { selected } : undefined}
      style={({ pressed }) => [s.row, selected && s.rowOn, pressed && s.pressed]}
    >
      <View style={s.rowLeft}>
        <View style={[s.rowIcon, selected && s.rowIconOn]}>
          <Icon name={icon} size={20} color={selected ? theme.colors.onPrimary : theme.colors.primary} />
        </View>
        <View style={s.flex}>
          <Text role="titleSm">{label}</Text>
          <Text role="caption" tone="secondary" numberOfLines={1}>
            {sub}
          </Text>
        </View>
      </View>
      {isChoice ? (
        <View style={[s.check, selected && s.checkOn]}>{selected ? <Icon name="check" size={14} color={theme.colors.onPrimary} /> : null}</View>
      ) : (
        <Icon name="chevron-left" size={22} color={theme.colors.border} />
      )}
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    flex: { flex: 1 },

    headerSafe: { backgroundColor: t.colors.surface },
    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.space.base,
      paddingBottom: t.space.sm,
    },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

    mapArea: { height: 300 },
    mapFab: {
      position: 'absolute',
      bottom: 16,
      width: 44,
      height: 44,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadow.md,
    },

    sheet: {
      flex: 1,
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radius.sheet,
      borderTopRightRadius: t.radius.sheet,
      marginTop: -t.space.xl,
      ...t.shadow.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.colors.surfaceHighest,
      marginTop: t.space.md,
    },
    sheetContent: { padding: t.space.lg, gap: t.space.md, paddingBottom: t.space['2xl'] },

    notice: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: t.space.sm,
      backgroundColor: t.colors.surfaceAlt,
      borderRadius: t.radius.control,
      padding: t.space.md,
    },

    products: { gap: t.space.sm },
    card: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: t.space.md,
      borderWidth: 1.5,
      borderColor: t.colors.hairline,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.surface,
      padding: t.space.base,
    },
    cardOn: { borderColor: t.colors.primary, backgroundColor: t.colors.surfaceAlt },
    cardOff: { opacity: 0.55 },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: t.radius.control,
      backgroundColor: t.colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardIconOn: { backgroundColor: t.colors.primary },
    note: { marginTop: 2 },
    priceCol: { alignItems: 'flex-start', minWidth: 84 },

    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: t.colors.hairline,
      borderRadius: t.radius.control,
      backgroundColor: t.colors.surface,
      padding: t.space.md,
    },
    rowOn: { borderColor: t.colors.primary, backgroundColor: t.colors.surfaceAlt },
    rowLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.space.md, flex: 1 },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: t.radius.control,
      backgroundColor: t.colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconOn: { backgroundColor: t.colors.primary },
    groupLabel: { marginTop: t.space.sm },

    check: {
      width: 24,
      height: 24,
      borderRadius: t.radius.pill,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },

    footer: {
      padding: t.space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.hairline,
      backgroundColor: t.colors.surface,
    },
    confirm: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 54,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.primary,
      paddingHorizontal: t.space.lg,
    },
    confirmOff: { opacity: 0.5 },
    pressed: { opacity: 0.9 },
  });
