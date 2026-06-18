import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Banner } from '../../../src/components/Banner';
import { Card, SectionTitle, Badge, EmptyState } from '../../../src/components/ui';
import { useI18n } from '../../../src/i18n';
import { api } from '../../../src/lib/api';
import { useTheme, type AppTheme } from '../../../src/theme';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState<TripPassenger[]>([]);
  const [code, setCode] = useState('');
  const [dropCode, setDropCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const [tr, p] = await Promise.all([api.driverTrips.show(id), api.driverTrips.passengers(id)]);
    setTrip(tr);
    setPassengers(p);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, okText: string) => {
    setMsg(null); setBusy(true);
    try { await fn(); setMsg({ text: okText, ok: true }); await load(); }
    catch (e) { setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false }); }
    finally { setBusy(false); }
  };

  const confirmBoarding = async () => {
    if (code.trim().length < 4) return;
    await act(() => api.driverTrips.confirmBoarding(id, code.trim()), t('driver.boardingConfirmed'));
    setCode('');
  };

  const confirmDropoff = async () => {
    if (dropCode.trim().length < 4) return;
    await act(() => api.driverTrips.confirmDropoff(id, dropCode.trim()), t('driver.dropoffConfirmed'));
    setDropCode('');
  };

  if (!trip) {
    return <SafeAreaView style={s.safe} edges={['top']}><Text style={s.meta}>{t('common.loading')}</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={s.row}>
            <Text style={s.title}>{trip.route?.name ?? t('driver.pooledTrip')}</Text>
            <Badge label={trip.status_label} tone={trip.status === 'completed' ? 'success' : trip.status === 'cancelled' ? 'danger' : 'primary'} />
          </View>
          {trip.scheduled_at && <Text style={s.meta}>{new Date(trip.scheduled_at).toLocaleString(locale)}</Text>}
        </Card>

        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {trip.status === 'scheduled' && (
          <View style={s.actions}>
            <Button title={t('driver.startTrip')} onPress={() => act(() => api.driverTrips.start(id), t('driver.tripStarted'))} loading={busy} />
            <Button title={t('common.cancel')} variant="outline" onPress={() => act(() => api.driverTrips.cancel(id), t('driver.tripCancelled'))} />
          </View>
        )}

        {trip.status === 'started' && (
          <>
            <Card>
              <SectionTitle title={t('driver.confirmBoardingTitle')} />
              <Text style={s.meta}>{t('driver.enterBoardingCode')}</Text>
              <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="----" style={s.codeInput} />
              <Button title={t('common.confirm')} onPress={confirmBoarding} loading={busy} />
            </Card>
            <Card>
              <SectionTitle title={t('driver.confirmDropoffTitle')} />
              <Text style={s.meta}>{t('driver.enterDropoffCode')}</Text>
              <Input value={dropCode} onChangeText={setDropCode} keyboardType="number-pad" maxLength={6} placeholder="----" style={s.codeInput} />
              <Button title={t('common.confirm')} onPress={confirmDropoff} loading={busy} />
            </Card>
            <Button title={t('driver.endTrip')} onPress={() => act(() => api.driverTrips.end(id), t('driver.tripEnded'))} style={{ marginBottom: theme.spacing.base }} />
          </>
        )}

        <SectionTitle title={`${t('driver.passengers')} (${passengers.length})`} />
        {passengers.length === 0 ? (
          <EmptyState icon="users" title={t('driver.noPassengers')} />
        ) : (
          passengers.map((p) => (
            <View key={p.id} style={s.pax}>
              <Text style={s.paxId}>{t('driver.passengerLabel')} #{p.id.slice(0, 6)}</Text>
              <Badge label={p.status_label} tone={p.status === 'onboard' || p.status === 'dropped' ? 'success' : 'muted'} />
            </View>
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
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.text },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    actions: { gap: t.spacing.md, marginBottom: t.spacing.base },
    codeInput: { textAlign: 'center', letterSpacing: 6, fontSize: 20, marginVertical: t.spacing.sm },
    pax: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    paxId: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text },
  });
