import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { DriverStatus, DriverPerformance } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Button } from '../../src/components/Button';
import { Card, ListRow, SectionTitle, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { LiveMap, type MapPoint } from '../../src/components/LiveMap';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useAvailability } from '../../src/store/availability';
import { api } from '../../src/lib/api';
import { getCurrentLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';

const statusMeta: Record<DriverStatus, { key: string; tone: 'warning' | 'primary' | 'success' | 'danger' }> = {
  pending: { key: 'driver.statusPending', tone: 'warning' },
  under_review: { key: 'driver.statusUnderReview', tone: 'primary' },
  approved: { key: 'driver.statusApproved', tone: 'success' },
  rejected: { key: 'driver.statusRejected', tone: 'danger' },
  suspended: { key: 'driver.statusSuspended', tone: 'danger' },
};

export default function Dashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const driver = useAuth((a) => a.driver);
  const driverLoaded = useAuth((a) => a.driverLoaded);
  const refreshDriver = useAuth((a) => a.refreshDriver);

  const online = useAvailability((a) => a.online);
  const setOnline = useAvailability((a) => a.setOnline);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perf, setPerf] = useState<DriverPerformance | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  const status = driver?.status ?? 'pending';
  const meta = statusMeta[status];
  const canSubmit = status === 'pending' || status === 'rejected';
  const approved = status === 'approved';

  useEffect(() => {
    if (approved) {
      api.payouts.performance().then(setPerf).catch(() => undefined);
      void getCurrentLocation().then((l) => l && setLoc(l));
    }
  }, [approved]);

  // Turn the captain Offline when leaving / unmounting is handled by the store.
  const jod = (fils: number) => (fils / 1000).toFixed(3);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.driver.submitForReview();
      await refreshDriver();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const mapPoints: MapPoint[] = loc ? [{ lat: loc.lat, lng: loc.lng, kind: 'captain', label: user?.full_name ?? '' }] : [];

  // Wait for the driver profile before deciding what to show — otherwise an
  // approved captain briefly sees the "pending / upload documents" state flash.
  if (!driverLoaded) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.avatar}><Text style={s.avatarText}>{(user?.full_name ?? 'ر').charAt(0)}</Text></View>
          <View style={s.headerText}>
            <Text style={s.greeting}>{t('driver.dashboard')}</Text>
            <Text style={s.name} numberOfLines={1}>{user?.full_name ?? ''}</Text>
          </View>
          <Badge label={t(meta.key)} tone={meta.tone} />
        </View>

        {status === 'rejected' && driver?.review_note ? <Banner message={driver.review_note} variant="error" /> : null}
        {error ? <Banner message={error} variant="error" /> : null}

        {approved && (
          <>
            {/* Map-first: captain location + online/offline */}
            <View style={s.mapWrap}>
              <LiveMap points={mapPoints} legend={false} height={280} />
            </View>

            <View style={[s.toggleCard, online && s.toggleCardOn]}>
              <View style={[s.statusDot, { backgroundColor: online ? theme.colors.success : theme.colors.muted }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.toggleTitle}>{online ? t('driver.online') : t('driver.offline')}</Text>
                <Text style={s.toggleHint} numberOfLines={2}>{online ? t('driver.onlineHint') : t('driver.offlineHint')}</Text>
              </View>
              <Switch
                value={online}
                onValueChange={(v) => void setOnline(v)}
                trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
                thumbColor={online ? theme.colors.onAccent : theme.colors.surface}
              />
            </View>

            {online && (
              <Card style={{ padding: 6 }}>
                <ListRow
                  icon="inbox"
                  title={t('driver.offers')}
                  trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />}
                  onPress={() => router.push('/(app)/offers')}
                />
              </Card>
            )}

            {/* Today earnings + stats */}
            <View style={s.statsRow}>
              <View style={s.statBoxWide}>
                <Text style={s.statLbl}>{t('driver.todayEarnings')}</Text>
                <Text style={s.statValBig}>{perf ? jod(perf.available_earnings_fils) : '—'} <Text style={s.cur}>{t('subscriptions.currency')}</Text></Text>
              </View>
            </View>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Icon name="star" size={18} color={theme.colors.accent} />
                <Text style={s.statVal}>{perf?.rating?.toFixed(1) ?? driver?.rating_avg?.toFixed(1) ?? '—'}</Text>
                <Text style={s.statLbl}>{t('driver.myRating')}</Text>
              </View>
              <View style={s.statBox}>
                <Icon name="navigation" size={18} color={theme.colors.primary} />
                <Text style={s.statVal}>{perf?.total_trips ?? driver?.total_trips ?? 0}</Text>
                <Text style={s.statLbl}>{t('driver.myTrips')}</Text>
              </View>
            </View>

            <Card style={{ padding: 6 }}>
              <ListRow icon="navigation" title={t('driver.myTrips')} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push('/(app)/trips')} />
              <ListRow icon="credit-card" title={t('driver.earnings')} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push('/(app)/earnings')} />
            </Card>
          </>
        )}

        <SectionTitle title={t('driver.documents')} />
        <Card style={{ padding: 6 }}>
          <ListRow icon="file-text" title={t('driver.documents')} subtitle={`${driver?.documents?.length ?? 0}`} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push('/(app)/documents')} />
          <ListRow icon="truck" title={t('driver.vehicle')} subtitle={`${driver?.vehicles?.length ?? 0}`} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push('/(app)/vehicle')} />
        </Card>

        {canSubmit ? <Button title={t('driver.submitReview')} onPress={onSubmit} loading={submitting} style={s.submit} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: t.spacing.lg },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.onPrimary },
    headerText: { flex: 1 },
    greeting: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text, textAlign: 'right' },

    mapWrap: { borderRadius: t.radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border, marginBottom: t.spacing.md },
    toggleCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.base, ...t.shadow.sm },
    toggleCardOn: { borderColor: t.colors.accent },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    toggleTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 17, color: t.colors.text, textAlign: 'right' },
    toggleHint: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    statsRow: { flexDirection: 'row-reverse', gap: t.spacing.base, marginBottom: t.spacing.base },
    statBoxWide: { flex: 1, backgroundColor: t.colors.primary, borderRadius: t.radius.xl, padding: t.spacing.lg, ...t.shadow.md },
    statValBig: { fontFamily: t.fontFamily.extrabold, fontSize: 30, color: t.colors.onPrimary, textAlign: 'right', marginTop: 4 },
    cur: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onPrimary },
    statBox: { flex: 1, backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, alignItems: 'center', ...t.shadow.sm },
    statVal: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, marginTop: 4 },
    statLbl: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, marginTop: 2, textAlign: 'right' },
    submit: { marginTop: t.spacing.lg },
  });
