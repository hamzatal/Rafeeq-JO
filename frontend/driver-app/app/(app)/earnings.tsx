import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { DriverPerformance, PayoutRequest, Wallet, WalletTransaction } from '@rafeeq/shared';
import { EmptyState, SectionTitle, StatCard, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Earnings() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [perf, setPerf] = useState<DriverPerformance | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);

  const load = useCallback(async () => {
    try {
      const [w, tx, p, wd] = await Promise.all([
        api.wallet.show(),
        api.wallet.transactions(),
        api.payouts.performance().catch(() => null),
        api.payouts.withdrawals().catch(() => []),
      ]);
      setWallet(w);
      setTxns(tx);
      setPerf(p);
      setPayouts(wd);
    } catch {
      /* silent */
    }
  }, []);

  // Refresh whenever the tab gains focus (e.g. after submitting a withdrawal).
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { void load(); }, [load]);

  const tierTone = (tier?: string) =>
    tier === 'gold' || tier === 'platinum' ? 'warning' : tier === 'silver' ? 'muted' : 'primary';

  const payoutStatusLabel = (st: string) =>
    ({ pending: t('payout.statusPending'), paid: t('payout.statusPaid'), rejected: t('payout.statusRejected') }[st] ?? st);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('payout.title')}</Text>

        <StatCard label={t('driver.balance')} value={`${wallet ? wallet.balance_jod.toFixed(3) : '—'} JOD`} icon="credit-card" />

        {/* Withdraw button */}
        <Pressable onPress={() => router.push('/(app)/withdraw')} style={s.withdrawBtn}>
          <Icon name="upload" size={18} color={theme.colors.onPrimary} />
          <Text style={s.withdrawText}>{t('payout.withdraw')}</Text>
        </Pressable>

        {/* Invoices / wallet top-up */}
        <Pressable onPress={() => router.push('/(app)/invoices')} style={s.invoicesLink}>
          <Icon name="file-text" size={16} color={theme.colors.primary} />
          <Text style={s.invoicesLinkText}>{t('payments.title')}</Text>
        </Pressable>

        {/* Performance / tier */}
        {perf && (
          <View style={s.tierCard}>
            <View style={s.row}>
              <Text style={s.tierTitle}>{t('performance.title')}</Text>
              <Badge label={perf.tier_label} tone={tierTone(perf.tier)} />
            </View>
            <View style={s.tierStatsRow}>
              <View style={s.tierStat}>
                <Text style={s.tierStatValue}>{perf.rating.toFixed(1)}</Text>
                <Text style={s.tierStatLabel}>{t('performance.rating')}</Text>
              </View>
              <View style={s.tierStat}>
                <Text style={s.tierStatValue}>{perf.total_trips}</Text>
                <Text style={s.tierStatLabel}>{t('performance.totalTrips')}</Text>
              </View>
              <View style={s.tierStat}>
                <Text style={s.tierStatValue}>{perf.points}</Text>
                <Text style={s.tierStatLabel}>{t('performance.points')}</Text>
              </View>
            </View>
            {perf.next_tier_label && (
              <>
                <Text style={s.meta}>{t('performance.progressToNext')} {perf.next_tier_label} — {perf.points_to_next} {t('performance.pointsToNext')}</Text>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, perf.progress_percent))}%` }]} />
                </View>
              </>
            )}
          </View>
        )}

        {/* Withdrawal history */}
        {payouts.length > 0 && (
          <>
            <SectionTitle title={t('payout.history')} />
            {payouts.map((p) => (
              <View key={p.id} style={s.txn}>
                <View style={[s.txnIcon, { backgroundColor: theme.colors.primary + '1F' }]}>
                  <Icon name="upload" size={18} color={theme.colors.primary} />
                </View>
                <View style={s.txnBody}>
                  <Text style={s.txnType}>{(p.amount_fils / 1000).toFixed(3)} JOD</Text>
                  {p.created_at && <Text style={s.meta}>{new Date(p.created_at).toLocaleString(locale)}</Text>}
                </View>
                <Badge label={payoutStatusLabel(p.status)} tone={p.status === 'paid' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'} />
              </View>
            ))}
          </>
        )}

        <SectionTitle title={t('wallet.transactions')} />
        {txns.length === 0 ? (
          <EmptyState icon="credit-card" title={t('wallet.noTransactions')} />
        ) : (
          txns.map((tx) => {
            const positive = tx.amount_fils >= 0;
            return (
              <View key={tx.id} style={s.txn}>
                <View style={[s.txnIcon, { backgroundColor: (positive ? theme.colors.success : theme.colors.danger) + '1F' }]}>
                  <Icon name={positive ? 'arrow-down-left' : 'arrow-up-right'} size={18} color={positive ? theme.colors.success : theme.colors.danger} />
                </View>
                <View style={s.txnBody}>
                  <Text style={s.txnType}>{tx.type_label}</Text>
                  {tx.created_at && <Text style={s.meta}>{new Date(tx.created_at).toLocaleString(locale)}</Text>}
                </View>
                <Text style={[s.txnAmount, { color: positive ? theme.colors.success : theme.colors.danger }]}>
                  {positive ? '+' : ''}{tx.amount_jod.toFixed(3)}
                </Text>
              </View>
            );
          })
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
    withdrawBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.primary, borderRadius: t.radius.lg, paddingVertical: 14, marginTop: t.spacing.md, marginBottom: t.spacing.base },
    withdrawText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onPrimary },
    invoicesLink: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: t.spacing.base },
    invoicesLinkText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
    tierCard: { backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.base },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    tierTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    tierStatsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: t.spacing.md },
    tierStat: { alignItems: 'center', flex: 1 },
    tierStatValue: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text },
    tierStatLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: t.colors.border, marginTop: 8, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 999, backgroundColor: t.colors.accent },
    txn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.md, marginBottom: t.spacing.sm },
    txnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    txnBody: { flex: 1 },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    txnAmount: { fontFamily: t.fontFamily.extrabold, fontSize: 15 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
  });
