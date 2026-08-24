import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Trip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SkeletonList, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const jod = (fils: number) => (fils / 1000).toFixed(2);

export default function Offers() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [offers, setOffers] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setOffers(await api.driverTrips.offers());
    } catch {
      setLoadError(true);
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
          <SkeletonList rows={3} />
        ) : loadError ? (
          <ErrorState title={t('common.error')} message={t('common.loadFailed')} retryLabel={t('common.retry')} onRetry={() => void load()} />
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
              {trip.pricing && (
                <View style={s.earnings}>
                  <View style={s.earnRow}>
                    <Text style={s.earnLabel}>{t('driver.farePerSeat')}</Text>
                    <Text style={s.earnValue}>{jod(trip.pricing.fare_fils)} د.أ</Text>
                  </View>
                  <View style={s.earnRow}>
                    <Text style={s.earnLabel}>{t('driver.platformCommission')}</Text>
                    <Text style={[s.earnValue, s.earnMinus]}>- {jod(trip.pricing.commission_fils)} د.أ</Text>
                  </View>
                  <View style={s.earnDivider} />
                  <View style={s.earnRow}>
                    <Text style={s.earnNetLabel}>{t('driver.yourNetEarnings')}</Text>
                    <Text style={s.earnNetValue}>{jod(trip.pricing.expected_captain_earnings_fils)} د.أ</Text>
                  </View>
                </View>
              )}
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
    earnings: { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: t.spacing.md, marginTop: t.spacing.md, gap: t.spacing.xs },
    earnRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    earnLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary },
    earnValue: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text },
    earnMinus: { color: t.colors.textSecondary },
    earnDivider: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.hairline, marginVertical: 2 },
    earnNetLabel: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },
    earnNetValue: { fontFamily: t.fontFamily.extrabold, fontSize: 17, color: t.colors.accent },
    btn: { marginTop: t.spacing.sm },
  });
