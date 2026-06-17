import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Trip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
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
    <Screen scroll>
      <Text style={s.h1}>{t('driver.offers')}</Text>
      {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

      {loading ? (
        <Text style={s.meta}>{t('common.loading')}</Text>
      ) : offers.length === 0 ? (
        <Text style={s.meta}>{t('driver.noOffers')}</Text>
      ) : (
        offers.map((trip) => (
          <View key={trip.id} style={s.card}>
            <View style={s.row}>
              <Text style={s.cardTitle}>{trip.route?.name ?? t('driver.offers')}</Text>
              <Text style={s.seats}>{trip.booked_count ?? 0}/{trip.capacity} {t('driver.seats')}</Text>
            </View>
            {trip.scheduled_at && <Text style={s.meta}>{new Date(trip.scheduled_at).toLocaleString(locale)}</Text>}
            <Button title={t('driver.acceptOffer')} onPress={() => accept(trip.id)} loading={busy === trip.id} style={s.btn} />
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.md },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    seats: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    btn: { marginTop: t.spacing.sm },
  });
