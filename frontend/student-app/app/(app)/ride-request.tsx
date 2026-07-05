import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FareQuote, RideDirection, RideRequest, RideType, University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { Skeleton, SegmentedControl } from '../../src/components/kit';
import { Icon } from '../../src/components/Icon';
import { LiveMap } from '../../src/components/LiveMap';
import { useToast, useConfirm } from '../../src/components/Feedback';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { getCurrentLocation } from '../../src/lib/permissions';
import { useCoupon } from '../../src/store/coupon';
import { useTheme, type AppTheme } from '../../src/theme';

const ACTIVE = ['pending', 'grouped', 'assigned'];

export default function RideRequestScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const confirm = useConfirm();

  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [type, setType] = useState<RideType>('scheduled');
  const [direction, setDirection] = useState<RideDirection>('to_university');
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [mine, setMine] = useState<RideRequest[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const couponCodeStore = useCoupon((c) => c.code);
  const hydrateCoupon = useCoupon((c) => c.hydrate);
  const activateCoupon = useCoupon((c) => c.activate);
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    void hydrateCoupon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (couponCodeStore && !coupon) setCoupon(couponCodeStore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCodeStore]);

  const load = async () => {
    try {
      const [unis, reqs] = await Promise.all([api.catalog.listUniversities(), api.rideRequests.mine()]);
      setUniversities(unis);
      setMine(reqs);
      if (!universityId && unis[0]) setUniversityId(unis[0].id);
    } catch {
      /* silent */
    } finally {
      setLoadingMine(false);
    }
  };
  useEffect(() => {
    load();
    void useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-estimate the fare whenever the ride type changes (modern, no extra tap).
  useEffect(() => {
    void estimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setLat(loc.lat);
        setLng(loc.lng);
      } else {
        toast.error(t('rideRequest.locationFailed'));
      }
    } finally {
      setLocating(false);
    }
  };

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    try {
      const amount = quote?.fare_fils ?? 1500;
      const res = await api.coupons.validate({ code, scope: 'ride', amount_fils: amount });
      await activateCoupon(res.code);
      toast.success(`${t('payments.couponApplied')} — ${(res.discount_fils / 1000).toFixed(3)} ${t('subscriptions.currency')}`);
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    }
  };

  const estimate = async () => {
    try {
      setQuote(await api.rideRequests.estimate({ type, riders: 1, capacity: 4 }));
    } catch {
      /* silent */
    }
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
        pickup_address: address || undefined,
        desired_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        type,
        direction,
        coupon_code: coupon.trim() || undefined,
      });
      toast.success(t('rideRequest.created'));
      await load();
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async (r: RideRequest) => {
    const ok = await confirm({ title: t('rideRequest.cancelConfirmTitle'), message: t('rideRequest.cancelConfirmMsg'), tone: 'danger', confirmLabel: t('common.confirm'), cancelLabel: t('common.cancel') });
    if (!ok) return;
    setCancelling(r.id);
    try {
      await api.rideRequests.cancel(r.id);
      toast.success(t('rideRequest.cancelled'));
      await load();
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setCancelling(null);
    }
  };

  const uni = universities.find((u) => u.id === universityId);
  const hasPickup = lat != null && lng != null;
  const hasDest = !!uni && uni.lat != null && uni.lng != null;
  const pts = [
    ...(hasPickup ? [{ lat: lat!, lng: lng!, kind: 'origin' as const, label: t('rideRequest.pickup') }] : []),
    ...(hasDest ? [{ lat: uni!.lat!, lng: uni!.lng!, kind: 'destination' as const, label: locale === 'ar' ? uni!.name_ar : uni!.name_en }] : []),
  ];
  const route = hasPickup && hasDest ? [{ lat: lat!, lng: lng! }, { lat: uni!.lat!, lng: uni!.lng! }] : undefined;
  const uniName = (u: University) => (locale === 'ar' ? u.name_ar : u.name_en);
  const fareJod = quote ? (quote.fare_fils / 1000).toFixed(3) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>{t('rideRequest.title')}</Text>

        {/* Map — prominent, map-first */}
        <View style={s.mapCard}>
          <LiveMap
            points={pts.length ? pts : [{ lat: uni?.lat ?? 32.5556, lng: uni?.lng ?? 35.85, kind: 'destination' }]}
            route={route}
            height={230}
            onPick={(p) => {
              setLat(Number(p.lat.toFixed(6)));
              setLng(Number(p.lng.toFixed(6)));
            }}
          />
        </View>

        {/* Trip card — destination (university) + pickup, Uber-style stacked rows */}
        <View style={s.tripCard}>
          <View style={s.tripRow}>
            <View style={[s.dot, { backgroundColor: theme.colors.success }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.tripLabel}>{t('rideRequest.university')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.uniRow}>
                {universities.map((u) => {
                  const on = universityId === u.id;
                  return (
                    <Pressable key={u.id} onPress={() => setUniversityId(u.id)} style={[s.uniPill, on && s.uniPillOn]}>
                      <Text style={[s.uniPillText, on && s.uniPillTextOn]} numberOfLines={1}>{uniName(u)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={s.tripConnector} />

          <View style={s.tripRow}>
            <View style={[s.dot, { backgroundColor: theme.colors.warning }]} />
            <View style={{ flex: 1 }}>
              <View style={s.pickupHead}>
                <Text style={s.tripLabel}>{t('rideRequest.pickup')}</Text>
                <Pressable onPress={useMyLocation} style={s.locBtn} disabled={locating} hitSlop={6}>
                  <Icon name="crosshair" size={14} color={theme.colors.accent} />
                  <Text style={s.locText}>{locating ? '...' : t('rideRequest.useMyLocation')}</Text>
                </Pressable>
              </View>
              <Text style={[s.pickupText, hasPickup && { color: theme.colors.success }]} numberOfLines={1}>
                {hasPickup ? t('rideRequest.locationSet') : t('rideRequest.tapMapHint')}
              </Text>
            </View>
          </View>

          <Input value={address} onChangeText={setAddress} placeholder={t('rideRequest.addressHint')} />
        </View>

        {/* Direction + ride type — segmented (clean, mutually exclusive) */}
        <Text style={s.section}>{t('rideRequest.direction')}</Text>
        <SegmentedControl<RideDirection>
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'to_university', label: t('rideRequest.toUniversity') },
            { value: 'from_university', label: t('rideRequest.fromUniversity') },
          ]}
        />

        <Text style={s.section}>{t('rideRequest.type')}</Text>
        <SegmentedControl<RideType>
          value={type}
          onChange={setType}
          options={[
            { value: 'scheduled', label: t('rideRequest.typeScheduled') },
            { value: 'express', label: t('rideRequest.typeExpress') },
          ]}
        />

        {/* Fare — auto-estimated, shown inline on an ink hero */}
        <View style={s.fareCard}>
          <View>
            <Text style={s.fareLabel}>{t('rideRequest.estimatedFare')}</Text>
            {quote ? (
              <Text style={s.fareMeta}>{t('rideRequest.surge')}: ×{quote.surge_multiplier}</Text>
            ) : (
              <Text style={s.fareMeta}>—</Text>
            )}
          </View>
          <Text style={s.fareVal}>{fareJod ? `${fareJod} ${t('subscriptions.currency')}` : '—'}</Text>
        </View>

        {/* Coupon */}
        <View style={s.couponCard}>
          <View style={s.couponInput}>
            <Input value={coupon} onChangeText={setCoupon} placeholder={t('payments.couponPlaceholder')} autoCapitalize="characters" />
          </View>
          <Pressable onPress={applyCoupon} style={s.couponApply} hitSlop={6}>
            <Text style={s.couponApplyText}>{t('payments.couponApply')}</Text>
          </Pressable>
        </View>

        <Button title={t('rideRequest.submit')} icon="navigation" onPress={submit} loading={busy} style={s.submit} />

        {/* My requests */}
        <SectionTitle title={t('rideRequest.myRequests')} />
        {loadingMine ? (
          <View style={{ gap: theme.spacing.sm }}>
            {[0, 1].map((i) => <Skeleton key={i} width="100%" height={72} radius={theme.radius.xl} />)}
          </View>
        ) : mine.length === 0 ? (
          <EmptyState icon="navigation" title={t('rideRequest.none')} />
        ) : (
          mine.map((r) => {
            const active = ACTIVE.includes(r.status);
            return (
              <View key={r.id} style={s.reqCard}>
                <View style={s.row}>
                  <Text style={s.cardTitle}>{r.zone ? (locale === 'ar' ? r.zone.name_ar : r.zone.name_en) : '—'}</Text>
                  <Badge label={r.status_label} tone={active ? 'primary' : r.status === 'completed' ? 'success' : 'muted'} />
                </View>
                <Text style={s.meta}>{r.is_express ? t('rideRequest.typeExpress') : t('rideRequest.typeScheduled')}</Text>
                {active && (
                  <Pressable onPress={() => cancelRequest(r)} style={s.cancelBtn} disabled={cancelling === r.id}>
                    <Icon name="x-circle" size={15} color={theme.colors.danger} />
                    <Text style={s.cancelText}>{cancelling === r.id ? '...' : t('rideRequest.cancel')}</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },

    mapCard: { borderRadius: t.radius['2xl'], overflow: 'hidden', marginBottom: t.spacing.base, ...t.shadow.md },

    tripCard: { backgroundColor: t.colors.card, borderRadius: t.radius['2xl'], padding: t.spacing.lg, marginBottom: t.spacing.base, ...t.shadow.sm },
    tripRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: t.spacing.md },
    dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
    tripConnector: { width: 2, height: 18, backgroundColor: t.colors.border, marginRight: 5, marginVertical: 4 },
    tripLabel: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    uniRow: { flexDirection: 'row-reverse', gap: t.spacing.sm, paddingTop: t.spacing.sm },
    uniPill: { paddingHorizontal: t.spacing.base, paddingVertical: 9, borderRadius: t.radius.full, backgroundColor: t.colors.background },
    uniPillOn: { backgroundColor: t.colors.primary },
    uniPillText: { fontFamily: t.fontFamily.semibold, fontSize: 13, color: t.colors.text, maxWidth: 180 },
    uniPillTextOn: { color: t.colors.onPrimary },

    pickupHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    pickupText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2, marginBottom: t.spacing.sm },
    locBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    locText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.accent },

    section: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },

    fareCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.colors.ink, borderRadius: t.radius['2xl'], padding: t.spacing.lg, marginTop: t.spacing.base, ...t.shadow.md },
    fareLabel: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.onInk, opacity: 0.85, textAlign: 'right' },
    fareMeta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.onInk, opacity: 0.7, textAlign: 'right', marginTop: 2 },
    fareVal: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.onInk },

    couponCard: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: t.spacing.sm, backgroundColor: t.colors.card, borderRadius: t.radius.xl, padding: t.spacing.md, marginTop: t.spacing.base, ...t.shadow.sm },
    couponInput: { flex: 1 },
    couponApply: { backgroundColor: t.colors.accentSoft, borderRadius: t.radius.md, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', marginBottom: t.spacing.base },
    couponApplyText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.accent },

    submit: { marginTop: t.spacing.lg, marginBottom: t.spacing.sm },

    reqCard: { backgroundColor: t.colors.card, borderRadius: t.radius.xl, padding: t.spacing.base, marginBottom: t.spacing.sm, ...t.shadow.sm },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    cancelBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: t.spacing.sm, backgroundColor: t.colors.dangerSoft, borderRadius: t.radius.md, paddingVertical: 10 },
    cancelText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.danger },
  });
