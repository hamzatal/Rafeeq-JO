import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Banner } from '../../../src/components/Banner';
import { api } from '../../../src/lib/api';
import { useTheme, type AppTheme } from '../../../src/theme';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState<TripPassenger[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([api.driverTrips.show(id), api.driverTrips.passengers(id)]);
    setTrip(t);
    setPassengers(p);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, okText: string) => {
    setMsg(null); setBusy(true);
    try { await fn(); setMsg({ text: okText, ok: true }); await load(); }
    catch (e) { setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل', ok: false }); }
    finally { setBusy(false); }
  };

  const confirmBoarding = async () => {
    if (code.trim().length < 4) return;
    await act(() => api.driverTrips.confirmBoarding(id, code.trim()), 'تم تأكيد الصعود');
    setCode('');
  };

  if (!trip) {
    return <SafeAreaView style={s.safe} edges={['top']}><Text style={s.meta}>جارٍ التحميل...</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.title}>{trip.route?.name ?? 'رحلة مجمّعة'}</Text>
            <Text style={s.badge}>{trip.status_label}</Text>
          </View>
          {trip.scheduled_at && <Text style={s.meta}>{new Date(trip.scheduled_at).toLocaleString('ar')}</Text>}
        </View>

        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {trip.status === 'scheduled' && (
          <View style={s.actions}>
            <Button title="بدء الرحلة" onPress={() => act(() => api.driverTrips.start(id), 'بدأت الرحلة')} loading={busy} />
            <Button title="إلغاء" variant="outline" onPress={() => act(() => api.driverTrips.cancel(id), 'أُلغيت')} />
          </View>
        )}

        {trip.status === 'started' && (
          <>
            <View style={s.card}>
              <Text style={s.section}>تأكيد صعود راكب</Text>
              <Text style={s.meta}>أدخل كود الصعود الذي يعرضه الطالب:</Text>
              <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="----" style={s.codeInput} />
              <Button title="تأكيد" onPress={confirmBoarding} loading={busy} />
            </View>
            <Button title="إنهاء الرحلة" onPress={() => act(() => api.driverTrips.end(id), 'انتهت الرحلة')} style={{ marginBottom: theme.spacing.base }} />
          </>
        )}

        <Text style={s.section}>الركاب ({passengers.length})</Text>
        {passengers.length === 0 ? (
          <Text style={s.meta}>لا يوجد ركاب</Text>
        ) : (
          passengers.map((p) => (
            <View key={p.id} style={s.pax}>
              <Text style={s.paxId}>راكب #{p.id.slice(0, 6)}</Text>
              <Text style={[s.badge, p.status === 'onboard' && { color: theme.colors.success }]}>{p.status_label}</Text>
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
    content: { padding: t.spacing.lg },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.base },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.text },
    section: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    badge: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.primary },
    actions: { gap: t.spacing.md, marginBottom: t.spacing.base },
    codeInput: { textAlign: 'center', letterSpacing: 6, fontSize: 20, marginVertical: t.spacing.sm },
    pax: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    paxId: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text },
  });
