import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FareQuote, RideRequest, RideType, University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card, EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { Skeleton } from '../../src/components/kit';
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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('rideRequest.title')}</Text>

        <SectionTitle title={t('rideRequest.university')} />
        <View style={s.chips}>
          {universities.map((u) => (
            <Pressable key={u.id} onPress={() => setUniversityId(u.id)} style={[s.chip, universityId === u.id && s.chipActive]}>
              <Text style={[s.chipText, universityId === u.id && s.chipTextActive]}>{locale === 'ar' ? u.name_ar : u.name_en}</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle title={t('rideRequest.pickup')} />
        <Card>
          {/* Location status + set button */}
          <View style={s.pickupHead}>
            <View style={s.pickupStatus}>
              <Icon name={hasPickup ? 'check-circle' : 'map-pin'} size={16} color={hasPickup ? theme.colors.success : theme.colors.muted} />
              <Text style={[s.pickupText, hasPickup && { color: theme.colors.success }]}>
                {hasPickup ? t('rideRequest.locationSet') : t('rideRequest.tapMapHint')}
              </Text>
            </View>
            <Pressable onPress={useMyLocation} style={s.locBtn} disabled={locating}>
              <Icon name="crosshair" size={15} color={theme.colors.primary} />
              <Text style={s.locText}>{locating ? '...' : t('rideRequest.useMyLocation')}</Text>
            </Pressable>
          </View>
          <View style={s.mapBox}>
            <LiveMap
              points={pts.length ? pts : [{ lat: uni?.lat ?? 32.5556, lng: uni?.lng ?? 35.85, kind: 'destination' }]}
              route={route}
              height={200}
              onPick={(p) => {
                setLat(Number(p.lat.toFixed(6)));
                setLng(Number(p.lng.toFixed(6)));
              }}
            />
          </View>
          <Input label={t('rideRequest.address')} value={address} onChangeText={setAddress} placeholder={t('rideRequest.addressHint')} />
        </Card>

        {/* Ride type */}
        <View style={s.typeRow}>
          <Pressable onPress={() => setType('scheduled')} style={[s.typeChip, type === 'scheduled' && s.chipActive]}>
            <Icon name="calendar" size={16} color={type === 'scheduled' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[s.chipText, type === 'scheduled' && s.chipTextActive]}>{t('rideRequest.typeScheduled')}</Text>
          </Pressable>
          <Pressable onPress={() => setType('express')} style={[s.typeChip, type === 'express' && s.chipActive]}>
            <Icon name="zap" size={16} color={type === 'express' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[s.chipText, type === 'express' && s.chipTextActive]}>{t('rideRequest.typeExpress')}</Text>
          </Pressable>
        </View>

        <Pressable onPress={estimate} style={s.estimateBtn}>
          <Icon name="dollar-sign" size={15} color={theme.colors.primary} />
          <Text style={s.locText}>{t('rideRequest.estimate')}</Text>
        </Pressable>
        {quote && (
          <Card style={{ borderColor: theme.colors.accent, borderWidth: 1.5 }}>
            <View style={s.row}>
              <Text style={s.quoteText}>{t('rideRequest.estimatedFare')}</Text>
              <Text style={s.quoteVal}>{(quote.fare_fils / 1000).toFixed(3)} {t('subscriptions.currency')}</Text>
            </View>
            <Text style={s.meta}>{t('rideRequest.surge')}: ×{quote.surge_multiplier}</Text>
          </Card>
        )}

        {/* Coupon */}
        <Card style={{ marginTop: theme.spacing.base }}>
          <SectionTitle title={t('payments.couponLabel')} />
          <View style={s.couponRow}>
            <View style={s.couponInput}>
              <Input label="" value={coupon} onChangeText={setCoupon} placeholder={t('payments.couponPlaceholder')} autoCapitalize="characters" />
            </View>
            <Pressable onPress={applyCoupon} style={s.couponApply}>
              <Text style={s.locText}>{t('payments.couponApply')}</Text>
            </Pressable>
          </View>
        </Card>

        <Button title={t('rideRequest.submit')} icon="navigation" onPress={submit} loading={busy} style={s.submit} />

        {/* My requests + cancel */}
        <SectionTitle title={t('rideRequest.myRequests')} />
        {loadingMine ? (
          <View style={{ gap: theme.spacing.sm }}>
            {[0, 1].map((i) => <Skeleton key={i} width="100%" height={72} radius={theme.radius.lg} />)}
          </View>
        ) : mine.length === 0 ? (
          <EmptyState icon="navigation" title={t('rideRequest.none')} />
        ) : (
          mine.map((r) => {
            const active = ACTIVE.includes(r.status);
            return (
              <Card key={r.id}>
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
              </Card>
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
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 8, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },

    pickupHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    pickupStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 },
    pickupText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    locBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 7, paddingHorizontal: 12 },
    locText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary },
    mapBox: { borderRadius: t.radius.md, overflow: 'hidden', marginBottom: t.spacing.sm },

    typeRow: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginTop: t.spacing.base },
    typeChip: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    estimateBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12, marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    quoteText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    quoteVal: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.primary },
    submit: { marginTop: t.spacing.base },
    couponRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: t.spacing.sm },
    couponInput: { flex: 1 },
    couponApply: { borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', marginBottom: 2 },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    cancelBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: t.spacing.sm, borderWidth: 1, borderColor: t.colors.danger, borderRadius: t.radius.md, paddingVertical: 9 },
    cancelText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.danger },
  });
