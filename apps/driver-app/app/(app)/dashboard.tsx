import { useState } from 'react';
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
import { theme } from '../../src/theme';

const statusMap: Record<DriverStatus, { key: string; variant: 'warning' | 'info' | 'success' | 'error' }> = {
  pending: { key: 'driver.statusPending', variant: 'warning' },
  under_review: { key: 'driver.statusUnderReview', variant: 'info' },
  approved: { key: 'driver.statusApproved', variant: 'success' },
  rejected: { key: 'driver.statusRejected', variant: 'error' },
  suspended: { key: 'driver.statusSuspended', variant: 'error' },
};

export default function Dashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const driver = useAuth((s) => s.driver);
  const refreshDriver = useAuth((s) => s.refreshDriver);
  const logout = useAuth((s) => s.logout);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = driver?.status ?? 'pending';
  const meta = statusMap[status];
  const canSubmit = status === 'pending' || status === 'rejected';

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>أهلاً كابتن 👋</Text>
            <Text style={styles.name}>{user?.full_name ?? ''}</Text>
          </View>
          <Pressable onPress={logout} style={styles.logout}>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </Pressable>
        </View>

        <Banner message={t(meta.key)} variant={meta.variant} />
        {status === 'rejected' && driver?.review_note ? (
          <Banner message={driver.review_note} variant="error" />
        ) : null}

        <Text style={styles.section}>خطوات التوثيق</Text>
        <Pressable style={styles.card} onPress={() => router.push('/(app)/documents')}>
          <Text style={styles.cardTitle}>{t('driver.documents')}</Text>
          <Text style={styles.cardMeta}>{driver?.documents?.length ?? 0} مرفوعة</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push('/(app)/vehicle')}>
          <Text style={styles.cardTitle}>{t('driver.vehicle')}</Text>
          <Text style={styles.cardMeta}>{driver?.vehicles?.length ?? 0} مركبة</Text>
        </Pressable>

        <Banner message={error} variant="error" />
        {canSubmit ? (
          <Button title={t('driver.submitReview')} onPress={onSubmit} loading={submitting} style={styles.submit} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  greeting: { fontFamily: theme.fontFamily.regular, fontSize: 15, color: theme.colors.textSecondary, textAlign: 'right' },
  name: { fontFamily: theme.fontFamily.extrabold, fontSize: 22, color: theme.colors.text, textAlign: 'right' },
  logout: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  logoutText: { color: theme.colors.danger, fontFamily: theme.fontFamily.medium, fontSize: 13 },
  section: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text, textAlign: 'right', marginBottom: theme.spacing.sm, marginTop: theme.spacing.sm },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text },
  cardMeta: { fontFamily: theme.fontFamily.regular, fontSize: 13, color: theme.colors.textSecondary },
  submit: { marginTop: theme.spacing.base },
});
