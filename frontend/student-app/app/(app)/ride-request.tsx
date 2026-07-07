import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { RideDirection, RideRequest, RideType, University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card, Badge } from '../../src/components/ui';
import { Skeleton, PressableScale } from '../../src/components/kit';
import { Icon } from '../../src/components/Icon';
import { LiveMap } from '../../src/components/LiveMap';
import { useToast, useConfirm } from '../../src/components/Feedback';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { getCurrentLocation } from '../../src/lib/permissions';
import { useCoupon } from '../../src/store/coupon';
import { useTheme, type AppTheme } from '../../src/theme';

const ACTIVE = ['pending', 'grouped', 'assigned'];

type ClassKey = 'economical' | 'family' | 'plus';
interface RideClass {
  key: ClassKey;
  labelKey: string;
  type: RideType;
  capacity: number;
  eta: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  featured?: boolean;
}
const CLASSES: RideClass[] = [
  { key: 'economical', labelKey: 'rideRequest.classEconomical', type: 'scheduled', capacity: 4, eta: 5, icon: 'directions-car' },
  { key: 'family', labelKey: 'rideRequest.classFamily', type: 'scheduled', capacity: 6, eta: 8, icon: 'airport-shuttle' },
  { key: 'plus', labelKey: 'rideRequest.classPlus', type: 'express', capacity: 4, eta: 4, icon: 'local-taxi', featured: true },
];

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
  const [direction, setDirection] = useState<RideDirection>('to_university');
  const [selectedClass, setSelectedClass] = useState<ClassKey>('economical');
  const [fares, setFares] = useState<Record<ClassKey, number | null>>({ economical: null, family: null, plus: null });
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
    load();
    void useMyLocation();
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
    void estimateClasses();
  };

  // Per-class fare preview. Final class-based pricing lands in Phase 3
  // (distance-based engine); today it reflects the backend estimate per type.
  const estimateClasses = async () => {
    const results = await Promise.all(
      CLASSES.map((c) =>
        api.rideRequests
          .estimate({ type: c.type, riders: 1, capacity: c.capacity })
          .then((q) => [c.key, q.fare_fils] as const)
          .catch(() => [c.key, null] as const),
      ),
    );
    setFares((prev) => {
      const next = { ...prev };
      for (const [k, v] of results) next[k] = v;
      return next;
    });
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setLat(loc.lat);
        setLng(loc.lng);
      }
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (!universityId) return toast.error(t('rideRequest.pickUniversity'));
    if (lat == null || lng == null) return toast.error(t('rideRequest.locationFailed'));
    const cls = CLASSES.find((c) => c.key === selectedClass)!;
    setBusy(true);
    try {
      if (coupon.trim()) {
        try {
          const res = await api.coupons.validate({ code: coupon.trim(), scope: 'ride', amount_fils: fares[selectedClass] ?? 1500 });
          await activateCoupon(res.code);
        } catch {
          /* invalid coupon — proceed without */
        }
      }
      await api.rideRequests.create({
        university_id: universityId,
        pickup_lat: lat,
        pickup_lng: lng,
        pickup_address: address || undefined,
        desired_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        type: cls.type,
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
  const fmt = (fils: number | null) => (fils == null ? '—' : `JOD ${(fils / 1000).toFixed(2)}`);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>رفيق</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Destination + direction */}
        <View style={s.destRow}>
          <View style={s.segment}>
            <Pressable onPress={() => setDirection('to_university')} style={[s.segBtn, direction === 'to_university' && s.segBtnOn]}>
              <Text style={[s.segText, direction === 'to_university' && s.segTextOn]}>{t('rideRequest.toUniversity')}</Text>
            </Pressable>
            <Pressable onPress={() => setDirection('from_university')} style={[s.segBtn, direction === 'from_university' && s.segBtnOn]}>
              <Text style={[s.segText, direction === 'from_university' && s.segTextOn]}>{t('rideRequest.fromUniversity')}</Text>
            </Pressable>
          </View>
        </View>
        <View style={s.chips}>
          {universities.map((u) => (
            <Pressable key={u.id} onPress={() => setUniversityId(u.id)} style={[s.chip, universityId === u.id && s.chipActive]}>
              <Text style={[s.chipText, universityId === u.id && s.chipTextActive]}>{locale === 'ar' ? u.name_ar : u.name_en}</Text>
            </Pressable>
          ))}
        </View>

        {/* Route map */}
        <View style={s.mapBox}>
          <LiveMap
            points={pts.length ? pts : [{ lat: uni?.lat ?? 32.5556, lng: uni?.lng ?? 35.85, kind: 'destination' }]}
            route={route}
            height={200}
            legend={false}
            onPick={(p) => {
              setLat(Number(p.lat.toFixed(6)));
              setLng(Number(p.lng.toFixed(6)));
            }}
          />
          <Pressable onPress={useMyLocation} style={s.locFab} hitSlop={8}>
            <Icon name="crosshair" size={18} color={theme.colors.accent} />
          </Pressable>
        </View>
        {!hasPickup ? <Text style={s.hint}>{t('rideRequest.tapMapHint')}</Text> : null}

        {/* Car classes */}
        <Text style={s.h2}>{t('rideRequest.chooseClass')}</Text>
        <View style={{ gap: theme.spacing.md }}>
          {CLASSES.map((c) => {
            const on = selectedClass === c.key;
            return (
              <PressableScale key={c.key} scaleTo={0.98} onPress={() => setSelectedClass(c.key)} style={[s.classCard, on && s.classCardOn]}>
                {/* radio + price (far left) */}
                <View style={s.classPrice}>
                  <View style={[s.radio, on && s.radioOn]}>{on ? <View style={s.radioDot} /> : null}</View>
                  <Text style={s.priceText}>{fmt(fares[c.key])}</Text>
                </View>
                {/* name + meta (right) */}
                <View style={s.classInfo}>
                  <View style={s.classNameRow}>
                    {c.featured ? <Icon name="star" size={14} color={theme.colors.accent} /> : null}
                    <Text style={s.className}>{t(c.labelKey)}</Text>
                  </View>
                  <View style={s.classMeta}>
                    <Text style={s.metaText}>{c.capacity} {t('rideRequest.seats')}</Text>
                    <Icon name="user" size={12} color={theme.colors.muted} />
                    <Text style={s.metaDot}>•</Text>
                    <Text style={s.metaText}>{c.eta} {t('rideRequest.minutes')}</Text>
                    <Icon name="clock" size={12} color={theme.colors.muted} />
                  </View>
                </View>
                {/* icon (leftmost of the RTL row = visually left) */}
                <View style={[s.classIcon, c.featured && s.classIconFeatured]}>
                  <MaterialIcons name={c.icon} size={26} color={c.featured ? theme.colors.accent : theme.colors.primary} />
                </View>
              </PressableScale>
            );
          })}
        </View>

        {/* Payment method */}
        <Text style={s.h3}>{t('rideRequest.paymentMethod')}</Text>
        <View style={s.payRow}>
          <Icon name="credit-card" size={18} color={theme.colors.primary} />
          <Text style={s.payText}>{t('rideRequest.walletPay')}</Text>
          <View style={{ flex: 1 }} />
          <Icon name="check-circle" size={18} color={theme.colors.success} />
        </View>

        {/* Coupon (compact) */}
        <View style={s.couponRow}>
          <View style={{ flex: 1 }}>
            <Input label="" value={coupon} onChangeText={setCoupon} placeholder={t('payments.couponPlaceholder')} autoCapitalize="characters" />
          </View>
        </View>

        {/* My active requests */}
        {loadingMine ? (
          <Skeleton width="100%" height={64} radius={theme.radius.lg} />
        ) : mine.filter((r) => ACTIVE.includes(r.status)).length ? (
          <>
            <Text style={s.h3}>{t('rideRequest.myRequests')}</Text>
            {mine.filter((r) => ACTIVE.includes(r.status)).map((r) => (
              <Card key={r.id}>
                <View style={s.cardRow}>
                  <Text style={s.cardTitle}>{r.zone ? (locale === 'ar' ? r.zone.name_ar : r.zone.name_en) : '—'}</Text>
                  <Badge label={r.status_label} tone="primary" />
                </View>
                <Pressable onPress={() => cancelRequest(r)} style={s.cancelBtn} disabled={cancelling === r.id}>
                  <Icon name="x-circle" size={15} color={theme.colors.danger} />
                  <Text style={s.cancelText}>{cancelling === r.id ? '...' : t('rideRequest.cancel')}</Text>
                </Pressable>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Sticky confirm */}
      <View style={s.footer}>
        <Button title={t('rideRequest.confirmRide')} icon="arrow-left" onPress={submit} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: { alignItems: 'center', paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: 120 },

    destRow: { marginBottom: t.spacing.md },
    segment: { flexDirection: 'row-reverse', backgroundColor: '#F0F3FF', borderRadius: t.radius.md, padding: 4 },
    segBtn: { flex: 1, paddingVertical: 9, borderRadius: t.radius.sm, alignItems: 'center' },
    segBtnOn: { backgroundColor: t.colors.surface, ...t.shadow.sm },
    segText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    segTextOn: { fontFamily: t.fontFamily.bold, color: t.colors.primary },

    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.base },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 8, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },

    mapBox: { borderRadius: t.radius.lg, overflow: 'hidden', height: 200, borderWidth: 1, borderColor: t.colors.hairline },
    locFab: { position: 'absolute', bottom: 12, right: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },
    hint: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'center', marginTop: t.spacing.sm },

    h2: { fontFamily: t.fontFamily.bold, fontSize: 20, color: t.colors.primary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.md },
    h3: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.sm },

    classCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1.5, borderColor: t.colors.hairline, padding: t.spacing.base },
    classCardOn: { borderColor: t.colors.primary, ...t.shadow.sm },
    classInfo: { flex: 1 },
    classNameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    className: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    classMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 4 },
    metaText: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },
    metaDot: { color: t.colors.muted, fontSize: 12 },
    classIcon: { width: 52, height: 52, borderRadius: t.radius.md, backgroundColor: '#DEE8FF', alignItems: 'center', justifyContent: 'center' },
    classIconFeatured: { backgroundColor: t.colors.accentSoft },
    classPrice: { alignItems: 'center', gap: 6, minWidth: 64 },
    priceText: { fontFamily: t.fontFamily.extrabold, fontSize: 15, color: t.colors.primary },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: t.colors.primary },
    radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: t.colors.primary },

    payRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base },
    payText: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.text },
    couponRow: { flexDirection: 'row-reverse', marginTop: t.spacing.sm },

    cardRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    cancelBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: t.spacing.sm, borderWidth: 1, borderColor: t.colors.danger, borderRadius: t.radius.md, paddingVertical: 9 },
    cancelText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.danger },

    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: t.spacing.lg, paddingTop: t.spacing.md, backgroundColor: t.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
  });
