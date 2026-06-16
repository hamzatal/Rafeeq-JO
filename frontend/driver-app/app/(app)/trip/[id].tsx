import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { Trip, TripPassenger } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Banner } from '../../../src/components/Banner';
import { api } from '../../../src/lib/api';
import { theme } from '../../../src/theme';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, okText: string) => {
    setMsg(null);
    setBusy(true);
    try {
      await fn();
      setMsg({ text: okText, ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const confirmBoarding = async () => {
    if (code.trim().length < 4) return;
    await act(() => api.driverTrips.confirmBoarding(id, code.trim()), 'تم تأكيد الصعود');
    setCode('');
  };

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.meta}>جارٍ التحميل...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{trip.route?.name ?? 'رحلة'}</Text>
            <Text style={styles.badge}>{trip.status_label}</Text>
          </View>
          {trip.scheduled_at && <Text style={styles.meta}>{new Date(trip.scheduled_at).toLocaleString('ar')}</Text>}
        </View>

        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {trip.status === 'scheduled' && (
          <View style={styles.actions}>
            <Button title="بدء الرحلة" onPress={() => act(() => api.driverTrips.start(id), 'بدأت الرحلة')} loading={busy} />
            <Button title="إلغاء" variant="outline" onPress={() => act(() => api.driverTrips.cancel(id), 'أُلغيت')} />
          </View>
        )}

        {trip.status === 'started' && (
          <>
            <View style={styles.card}>
              <Text style={styles.section}>تأكيد صعود راكب</Text>
              <Text style={styles.meta}>أدخل كود الصعود الذي يعرضه الطالب:</Text>
              <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="----" style={styles.codeInput} />
              <Button title="تأكيد" onPress={confirmBoarding} loading={busy} />
            </View>
            <Button title="إنهاء الرحلة" onPress={() => act(() => api.driverTrips.end(id), 'انتهت الرحلة')} style={{ marginBottom: theme.spacing.base }} />
          </>
        )}

        <Text style={styles.section}>الركاب ({passengers.length})</Text>
        {passengers.length === 0 ? (
          <Text style={styles.meta}>لا يوجد ركاب محجوزون</Text>
        ) : (
          passengers.map((p) => (
            <View key={p.id} style={styles.pax}>
              <Text style={styles.paxId}>راكب #{p.id.slice(0, 6)}</Text>
              <Text style={[styles.badge, p.status === 'onboard' && { color: theme.colors.success }]}>{p.status_label}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.base, marginBottom: theme.spacing.base },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: theme.fontFamily.extrabold, fontSize: 18, color: theme.colors.text },
  section: { fontFamily: theme.fontFamily.bold, fontSize: 15, color: theme.colors.text, textAlign: 'right', marginBottom: theme.spacing.sm },
  meta: { fontFamily: theme.fontFamily.regular, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  badge: { fontFamily: theme.fontFamily.medium, fontSize: 13, color: theme.colors.primary },
  actions: { gap: theme.spacing.md, marginBottom: theme.spacing.base },
  codeInput: { textAlign: 'center', letterSpacing: 6, fontSize: 20, marginVertical: theme.spacing.sm },
  pax: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.base, marginBottom: theme.spacing.sm },
  paxId: { fontFamily: theme.fontFamily.medium, fontSize: 14, color: theme.colors.text },
});
