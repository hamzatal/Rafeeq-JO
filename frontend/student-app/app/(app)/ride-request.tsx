import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { text, type RideDirection, type RideType, type University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { LiveMap } from '../../src/components/LiveMap';
import { PressableScale } from '../../src/components/kit';
import { useToast } from '../../src/components/Feedback';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { getCurrentLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';

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

/**
 * Ride class selection — pixel-faithful to Stitch `_16` (Taxi Selection):
 * top app bar (RTL back + Rafeeq) → map with origin/destination markers →
 * bottom sheet (drag handle → "اختر فئة السيارة" → 3 car cards → destination +
 * payment selector rows → sticky "تأكيد طلب التاكسي"). Functional logic
 * (universities, per-class estimate, submit, location) is preserved.
 */
export default function RideRequestScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const router = useRouter();

  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [direction, setDirection] = useState<RideDirection>('to_university');
  const [selectedClass, setSelectedClass] = useState<ClassKey>('economical');
  const [fares, setFares] = useState<Record<ClassKey, number | null>>({ economical: null, family: null, plus: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
    void useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const unis = await api.catalog.listUniversities();
      setUniversities(unis);
      if (!universityId && unis[0]) setUniversityId(unis[0].id);
    } catch {
      /* silent */
    }
    void estimateClasses();
  };

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
    const loc = await getCurrentLocation();
    if (loc) {
      setLat(loc.lat);
      setLng(loc.lng);
    }
  };

  const cycleUniversity = () => {
    if (universities.length < 2) return;
    const i = universities.findIndex((u) => u.id === universityId);
    setUniversityId(universities[(i + 1) % universities.length].id);
  };

  const submit = async () => {
    if (!universityId) return toast.error(t('rideRequest.pickUniversity'));
    if (lat == null || lng == null) return toast.error(t('rideRequest.locationFailed'));
    const cls = CLASSES.find((c) => c.key === selectedClass)!;
    setBusy(true);
    try {
      await api.rideRequests.create({
        university_id: universityId,
        pickup_lat: lat,
        pickup_lng: lng,
        desired_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        type: cls.type,
        direction,
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
  const hasDest = !!uni && uni.lat != null && uni.lng != null;
  const pts = [
    ...(hasPickup ? [{ lat: lat!, lng: lng!, kind: 'origin' as const, label: t('rideRequest.pickup') }] : []),
    ...(hasDest ? [{ lat: uni!.lat!, lng: uni!.lng!, kind: 'destination' as const, label: uniName }] : []),
  ];
  const route = hasPickup && hasDest ? [{ lat: lat!, lng: lng! }, { lat: uni!.lat!, lng: uni!.lng! }] : undefined;
  const fmt = (fils: number | null) => (fils == null ? '—' : `${(fils / 1000).toFixed(2)} JOD`);
  const dirLabel = direction === 'to_university' ? t('rideRequest.toUniversity') : t('rideRequest.fromUniversity');

  return (
    <View style={s.root}>
      {/* Top app bar (RTL back + centered brand + spacer) */}
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <MaterialIcons name="arrow-forward" size={24} color={theme.colors.textSecondary} />
          </Pressable>
          <Text style={s.brand}>رفيق</Text>
          <View style={s.backBtn} />
        </View>
      </SafeAreaView>

      {/* Map canvas with markers */}
      <View style={s.mapArea}>
        <LiveMap
          points={pts.length ? pts : [{ lat: uni?.lat ?? 32.5556, lng: uni?.lng ?? 35.85, kind: 'destination' }]}
          route={route}
          height={320}
          legend={false}
          onPick={(p) => {
            setLat(Number(p.lat.toFixed(6)));
            setLng(Number(p.lng.toFixed(6)));
          }}
        />
        <Pressable onPress={() => setDirection((d) => (d === 'to_university' ? 'from_university' : 'to_university'))} style={[s.mapFab, { right: 16 }]} hitSlop={8}>
          <MaterialIcons name="swap-vert" size={20} color={theme.colors.primary} />
        </Pressable>
        <Pressable onPress={useMyLocation} style={[s.mapFab, { right: 68 }]} hitSlop={8}>
          <MaterialIcons name="my-location" size={20} color={theme.colors.accent} />
        </Pressable>
      </View>

      {/* Selection bottom sheet */}
      <View style={s.sheet}>
        <View style={s.handle} />
        <ScrollView contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>{t('rideRequest.chooseClass')}</Text>

          <View style={s.carList}>
            {CLASSES.map((c) => {
              const on = selectedClass === c.key;
              const iconColor = c.featured ? theme.colors.accent : on ? theme.colors.primary : theme.colors.textSecondary;
              return (
                <PressableScale key={c.key} scaleTo={0.98} onPress={() => setSelectedClass(c.key)} style={[s.carCard, on && s.carCardOn]}>
                  <View style={[s.carIcon, on ? s.carIconOn : s.carIconOff]}>
                    <MaterialIcons name={c.icon} size={30} color={iconColor} />
                  </View>
                  <View style={s.carDetails}>
                    <View style={s.carTop}>
                      <View style={s.carNameRow}>
                        <Text style={s.carName}>{t(c.labelKey)}</Text>
                        {c.featured && <MaterialIcons name="star" size={16} color={theme.colors.accent} />}
                      </View>
                      <Text style={[s.carPrice, on && { color: theme.colors.primary }]}>{fmt(fares[c.key])}</Text>
                    </View>
                    <View style={s.carMeta}>
                      <MaterialIcons name="schedule" size={16} color={theme.colors.textSecondary} />
                      <Text style={s.metaText}>{c.eta} {t('rideRequest.minutes')}</Text>
                      <View style={s.metaDot} />
                      <MaterialIcons name="person" size={16} color={theme.colors.textSecondary} />
                      <Text style={s.metaText}>{c.capacity} {t('rideRequest.seats')}</Text>
                    </View>
                  </View>
                  <View style={[s.ring, on && s.ringOn]}>{on && <View style={s.ringDot} />}</View>
                </PressableScale>
              );
            })}
          </View>

          {/* Destination selector row (design-consistent with _16 payment row) */}
          <SelectorRow theme={theme} icon="place" label={dirLabel} sub={uniName} onPress={cycleUniversity} />

          {/* Payment method */}
          <Text style={s.selLabel}>{t('rideRequest.paymentMethod')}</Text>
          <SelectorRow theme={theme} icon="account-balance-wallet" label={t('rideRequest.walletPay')} sub="CliQ" onPress={() => {}} />
        </ScrollView>

        {/* Sticky confirm */}
        <View style={s.footer}>
          <PressableScale onPress={submit} scaleTo={0.97} style={[s.confirm, busy && { opacity: 0.7 }]}>
            <Text style={s.confirmText}>{busy ? t('common.loading') : t('rideRequest.confirmRide')}</Text>
            <MaterialIcons name="arrow-forward" size={20} color={theme.colors.onPrimary} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

function SelectorRow({ theme, icon, label, sub, onPress }: { theme: AppTheme; icon: keyof typeof MaterialIcons.glyphMap; label: string; sub: string; onPress: () => void }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={s.selRow}>
      <View style={s.selLeft}>
        <View style={s.selIcon}>
          <MaterialIcons name={icon} size={20} color={theme.colors.onPrimary} />
        </View>
        <View>
          <Text style={s.selRowLabel}>{label}</Text>
          <Text style={s.selRowSub}>{sub}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-left" size={22} color={theme.colors.border} />
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },

    // App bar
    headerSafe: { backgroundColor: t.colors.surface, zIndex: 20, ...t.shadow.sm },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { ...text.displayLgMobile, color: t.colors.primary },

    // Map
    mapArea: { height: 320, backgroundColor: t.colors.surfaceHighest },
    mapFab: { position: 'absolute', bottom: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },

    // Bottom sheet
    sheet: { flex: 1, backgroundColor: t.colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: -16, ...t.shadow.lg },
    handle: { alignSelf: 'center', width: 48, height: 6, borderRadius: 9999, backgroundColor: t.colors.border, opacity: 0.5, marginTop: 12, marginBottom: 4 },
    sheetContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
    title: { ...text.headlineMd, color: t.colors.text, textAlign: 'right', marginBottom: 24 },

    // Car cards
    carList: { gap: 12, marginBottom: 24 },
    carCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface, borderRadius: 12, padding: 16, position: 'relative' },
    carCardOn: { borderColor: t.colors.primary, backgroundColor: t.colors.surfaceAlt, ...t.shadow.sm },
    carIcon: { width: 64, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    carIconOn: { backgroundColor: t.colors.surfaceHighest },
    carIconOff: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.surfaceHighest },
    carDetails: { flex: 1 },
    carTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    carNameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    carName: { ...text.labelSm, fontFamily: t.fontFamily.bold, color: t.colors.text },
    carPrice: { ...text.labelSm, fontFamily: t.fontFamily.bold, color: t.colors.text },
    carMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    metaText: { ...text.caption, color: t.colors.textSecondary },
    metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: t.colors.border, marginHorizontal: 2 },
    ring: { position: 'absolute', left: 16, top: '50%', marginTop: -10, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    ringOn: { borderColor: t.colors.primary },
    ringDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.primary },

    // Selector rows (destination + payment)
    selLabel: { ...text.labelSm, color: t.colors.textSecondary, textAlign: 'right', marginTop: 24, marginBottom: 8 },
    selRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface, marginTop: 8 },
    selLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    selIcon: { width: 32, height: 32, borderRadius: 4, backgroundColor: t.colors.primaryContainer, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    selRowLabel: { ...text.labelSm, fontFamily: t.fontFamily.bold, color: t.colors.text, textAlign: 'right' },
    selRowSub: { ...text.caption, color: t.colors.textSecondary, textAlign: 'right' },

    // Footer confirm
    footer: { backgroundColor: t.colors.surface, padding: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.surfaceHighest },
    confirm: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.primary, borderRadius: 12, paddingVertical: 16 },
    confirmText: { ...text.labelSm, fontFamily: t.fontFamily.bold, color: t.colors.onPrimary },
  });
