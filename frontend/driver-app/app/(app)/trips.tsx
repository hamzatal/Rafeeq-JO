import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Route, Trip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SectionTitle } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function DriverTrips() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const initial = (user?.full_name ?? 'ر').charAt(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, r] = await Promise.all([api.driverTrips.list(), api.catalog.listRoutes()]);
      setTrips(tr);
      setRoutes(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const schedule = async (hour: number, dayOffset: number) => {
    if (!selectedRoute) { setMsg({ text: t('driver.pickRouteFirst'), ok: false }); return; }
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    setMsg(null); setBusy(true);
    try {
      await api.driverTrips.schedule({ route_id: selectedRoute, scheduled_at: d.toISOString() });
      setMsg({ text: t('driver.scheduled'), ok: true });
      setSelectedRoute(null);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('driver.scheduleFailed'), ok: false });
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — avatar (right) · Rafeeq · bell (left) per Stitch _21 */}
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
        <Text style={s.brand}>رفيق</Text>
        <Pressable hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('driver.myTrips')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        <Card>
          <SectionTitle title={t('driver.scheduleNew')} />
          <Text style={s.meta}>{t('driver.pickRoute')}</Text>
          <View style={s.chips}>
            {routes.length === 0 && <Text style={s.meta}>{t('driver.noRoutes')}</Text>}
            {routes.map((r) => (
              <Pressable key={r.id} onPress={() => setSelectedRoute(r.id)} style={[s.chip, selectedRoute === r.id && s.chipActive]}>
                <Text style={[s.chipText, selectedRoute === r.id && s.chipTextActive]}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
          {selectedRoute && (
            <View style={s.times}>
              <Pressable onPress={() => schedule(7, 1)} disabled={busy} style={s.timeBtn}><Text style={s.timeText}>{t('driver.tomorrowMorning')}</Text></Pressable>
              <Pressable onPress={() => schedule(16, 1)} disabled={busy} style={s.timeBtn}><Text style={s.timeText}>{t('driver.tomorrowEvening')}</Text></Pressable>
            </View>
          )}
        </Card>

        <SectionTitle title={t('driver.tripsSection')} />
        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : trips.length === 0 ? (
          <EmptyState icon="navigation" title={t('trips.none')} />
        ) : (
          trips.map((tr) => {
            const completed = tr.status === 'completed';
            const time = tr.scheduled_at ? new Date(tr.scheduled_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
            const fareJod = tr.pricing?.fare_fils != null ? (tr.pricing.fare_fils / 1000).toFixed(2) : null;
            return (
              <Pressable key={tr.id} onPress={() => router.push(`/(app)/trip/${tr.id}` as never)} style={({ pressed }) => [s.tripCard, pressed && { opacity: 0.9 }]}>
                <View style={s.tripMain}>
                  <View style={s.tripIcon}>
                    <Icon name="navigation" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {time ? <Text style={s.tripTime}>{time}</Text> : null}
                    <Text style={s.tripRoute} numberOfLines={1}>{tr.route?.name ?? t('driver.pooledTrip')}</Text>
                    <View style={s.tripStatusRow}>
                      <Icon name={completed ? 'check-circle' : 'clock'} size={13} color={completed ? theme.colors.accent : theme.colors.textSecondary} />
                      <Text style={[s.tripStatus, { color: completed ? theme.colors.accent : theme.colors.textSecondary }]}>{tr.status_label}</Text>
                      <Text style={s.tripPax}>· {tr.booked_count ?? 0}/{tr.capacity}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.tripFareCol}>
                  {fareJod ? (
                    <>
                      <Text style={s.tripFare}>{fareJod}</Text>
                      <Text style={s.tripFareCur}>{t('subscriptions.currency')}</Text>
                    </>
                  ) : (
                    <Icon name="chevron-left" size={20} color={theme.colors.muted} />
                  )}
                </View>
              </Pressable>
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
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, backgroundColor: t.colors.surface, ...t.shadow.sm },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 32, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.semibold, fontSize: 24, lineHeight: 32, color: t.colors.primary, textAlign: 'right', marginBottom: t.spacing.base },

    tripCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, padding: 16, marginBottom: t.spacing.sm, ...t.shadow.sm },
    tripMain: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: t.spacing.md, flex: 1 },
    tripIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    tripTime: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.primary, textAlign: 'right' },
    tripRoute: { fontFamily: t.fontFamily.regular, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: 2 },
    tripStatusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    tripStatus: { fontFamily: t.fontFamily.regular, fontSize: 12 },
    tripPax: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted },
    tripFareCol: { alignItems: 'flex-start', minWidth: 44 },
    tripFare: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 30, color: t.colors.primary },
    tripFareCur: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'left' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.full, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: t.colors.surface },
    chipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipText: { fontFamily: t.fontFamily.medium, color: t.colors.text, fontSize: 13 },
    chipTextActive: { color: t.colors.onPrimary },
    times: { flexDirection: 'row-reverse', gap: 10, marginTop: t.spacing.md },
    timeBtn: { flex: 1, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10, alignItems: 'center' },
    timeText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },
  });
