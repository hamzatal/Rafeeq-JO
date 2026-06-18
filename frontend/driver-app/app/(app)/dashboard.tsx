import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { DriverStatus, DriverPerformance } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Button } from '../../src/components/Button';
import { Card, ListRow, SectionTitle, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
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
  const refreshDriver = useAuth((a) => a.refreshDriver);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perf, setPerf] = useState<DriverPerformance | null>(null);

  const status = driver?.status ?? 'pending';
  const meta = statusMeta[status];
  const canSubmit = status === 'pending' || status === 'rejected';
  const approved = status === 'approved';

  useEffect(() => {
    if (approved) {
      api.payouts.performance().then(setPerf).catch(() => undefined);
    }
  }, [approved]);

  const jod = (fils: number) => (fils / 1000).toFixed(3);

  const onSubmit = async () => {
    setError(null); setSubmitting(true);
    try {
      await api.driver.submitForReview();
      await refreshDriver();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally { setSubmitting(false); }
  };

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
          <View style={s.hero}>
            <View style={s.heroGlow} />
            <View style={s.heroTopRow}>
              <Text style={s.heroLabel}>{t('driver.earnings')}</Text>
              {perf ? (
                <View style={s.tierChip}>
                  <Icon name="award" size={13} color={theme.colors.primary} />
                  <Text style={s.tierChipText}>{perf.tier_label}</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.heroValue}>
              {perf ? jod(perf.available_earnings_fils) : '—'}
              <Text style={s.heroCur}> {t('subscriptions.currency')}</Text>
            </Text>
            <Button title={t('driver.earnings')} onPress={() => router.push('/(app)/earnings')} style={s.heroBtn} />
          </View>
        )}

        {approved && (
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
        )}

        {approved && (
          <>
            <SectionTitle title={t('driver.dashboard')} />
            <Card style={{ padding: 6 }}>
              <ListRow icon="inbox" title={t('driver.offers')} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push('/(app)/offers')} />
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
    statsRow: { flexDirection: 'row-reverse', gap: t.spacing.base, marginBottom: t.spacing.sm },
    hero: { backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.primary + '44', padding: t.spacing.lg, marginBottom: t.spacing.base, overflow: 'hidden', ...t.shadow.md },
    heroGlow: { position: 'absolute', top: -40, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: t.colors.primary, opacity: 0.12 },
    heroTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.xs },
    heroLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary },
    tierChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: t.colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: t.radius.full },
    tierChipText: { fontFamily: t.fontFamily.bold, fontSize: 11, color: t.colors.onPrimary },
    heroValue: { fontFamily: t.fontFamily.extrabold, fontSize: 36, color: t.colors.primary, textAlign: 'right' },
    heroCur: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.textSecondary },
    heroBtn: { marginTop: t.spacing.md },
    statBox: { flex: 1, backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, alignItems: 'center', ...t.shadow.sm },
    statVal: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, marginTop: 4 },
    statLbl: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },
    submit: { marginTop: t.spacing.lg },
  });
