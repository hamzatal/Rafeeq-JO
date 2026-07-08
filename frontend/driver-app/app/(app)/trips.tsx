import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Route, Trip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function DriverTrips() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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
      <View style={s.header}>
        <View style={s.headerBtn} />
        <Text style={s.brand}>رفيق</Text>
        <View style={s.headerBtn} />
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
          trips.map((tr) => (
            <Card key={tr.id} onPress={() => router.push(`/(app)/trip/${tr.id}` as never)}>
              <View style={s.row}>
                <Text style={s.tripTitle}>{tr.route?.name ?? t('driver.pooledTrip')}</Text>
                <Badge label={tr.status_label} tone={tr.status === 'completed' ? 'success' : 'primary'} />
              </View>
              {tr.scheduled_at && <Text style={s.meta}>{new Date(tr.scheduled_at).toLocaleString(locale)}</Text>}
              <View style={s.paxRow}>
                <Icon name="users" size={14} color={theme.colors.textSecondary} />
                <Text style={s.meta}>{t('driver.passengers')}: {tr.booked_count ?? 0}/{tr.capacity}</Text>
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
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    headerBtn: { width: 40, height: 40 },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.primary, textAlign: 'right', marginBottom: t.spacing.base },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.full, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: t.colors.surface },
    chipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipText: { fontFamily: t.fontFamily.medium, color: t.colors.text, fontSize: 13 },
    chipTextActive: { color: t.colors.onPrimary },
    times: { flexDirection: 'row-reverse', gap: 10, marginTop: t.spacing.md },
    timeBtn: { flex: 1, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10, alignItems: 'center' },
    timeText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    tripTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    paxRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  });
