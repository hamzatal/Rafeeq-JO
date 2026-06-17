import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { DriverStatus } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Button } from '../../src/components/Button';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const statusMeta: Record<DriverStatus, { key: string; variant: 'warning' | 'info' | 'success' | 'error' }> = {
  pending: { key: 'driver.statusPending', variant: 'warning' },
  under_review: { key: 'driver.statusUnderReview', variant: 'info' },
  approved: { key: 'driver.statusApproved', variant: 'success' },
  rejected: { key: 'driver.statusRejected', variant: 'error' },
  suspended: { key: 'driver.statusSuspended', variant: 'error' },
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

  const status = driver?.status ?? 'pending';
  const meta = statusMeta[status];
  const canSubmit = status === 'pending' || status === 'rejected';

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
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>أهلاً كابتن 👋</Text>
            <Text style={s.name}>{user?.full_name ?? ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/settings')} style={s.iconBtn}><Text style={s.iconText}>⚙︎</Text></Pressable>
        </View>

        <Banner message={t(meta.key)} variant={meta.variant} />
        {status === 'rejected' && driver?.review_note ? <Banner message={driver.review_note} variant="error" /> : null}

        <Text style={s.section}>خطوات التوثيق</Text>
        <Pressable style={s.card} onPress={() => router.push('/(app)/documents')}>
          <Text style={s.cardTitle}>{t('driver.documents')}</Text>
          <Text style={s.cardMeta}>{driver?.documents?.length ?? 0} مرفوعة</Text>
        </Pressable>
        <Pressable style={s.card} onPress={() => router.push('/(app)/vehicle')}>
          <Text style={s.cardTitle}>{t('driver.vehicle')}</Text>
          <Text style={s.cardMeta}>{driver?.vehicles?.length ?? 0} مركبة</Text>
        </Pressable>
        {status === 'approved' && (
          <Pressable style={s.card} onPress={() => router.push('/(app)/trips')}>
            <Text style={s.cardTitle}>{t('driver.myTrips')}</Text>
            <Text style={s.cardMeta}>جدولة وإدارة رحلاتك</Text>
          </Pressable>
        )}

        <Banner message={error} variant="error" />
        {canSubmit ? <Button title={t('driver.submitReview')} onPress={onSubmit} loading={submitting} style={s.submit} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg },
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.lg },
    greeting: { fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right' },
    iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    iconText: { fontSize: 18, color: t.colors.text },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm, marginTop: t.spacing.sm },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.md, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    cardMeta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary },
    submit: { marginTop: t.spacing.base },
  });
