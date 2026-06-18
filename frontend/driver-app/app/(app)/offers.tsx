import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Trip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Offers() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [offers, setOffers] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOffers(await api.driverTrips.offers());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (tripId: string) => {
    setMsg(null);
    setBusy(tripId);
    try {
      await api.driverTrips.acceptOffer(tripId);
      setMsg({ text: t('driver.offerAccepted'), ok: true });
      await load();
      router.push(`/(app)/trip/${tripId}`);
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('driver.offers')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : offers.length === 0 ? (
          <EmptyState icon="inbox" title={t('driver.noOffers')} />
        ) : (
          offers.map((trip) => (
            <Card key={trip.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{trip.route?.name ?? t('driver.offers')}</Text>
                <View style={s.seats}>
                  <Icon name="users" size={14} color={theme.colors.textSecondary} />
                  <Text style={s.seatsText}>{trip.booked_count ?? 0}/{trip.capacity} {t('driver.seats')}</Text>
                </View>
              </View>
              {trip.scheduled_at && <Text style={s.meta}>{new Date(trip.scheduled_at).toLocaleString(locale)}</Text>}
              <Button title={t('driver.acceptOffer')} onPress={() => accept(trip.id)} loading={busy === trip.id} style={s.btn} />
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
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, flex: 1, textAlign: 'right' },
    seats: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    seatsText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    btn: { marginTop: t.spacing.sm },
  });
