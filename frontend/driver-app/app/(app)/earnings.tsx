import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { PayoutRequest, Wallet, WalletTransaction } from '@rafeeq/shared';
import { EmptyState, SkeletonList, ErrorState } from '../../src/components/ui';
import { Icon, type IconName } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

function txnVisual(type: string, positive: boolean): { icon: IconName; navy: boolean } {
  if (type.includes('payout') || type.includes('withdraw')) return { icon: 'home', navy: true };
  if (type.includes('trip') || type.includes('ride') || type.includes('earn')) return { icon: 'navigation', navy: false };
  return { icon: positive ? 'arrow-down-left' : 'arrow-up-right', navy: !positive };
}

export default function Earnings() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [w, tx, wd] = await Promise.all([
        api.wallet.show(),
        api.wallet.transactions(),
        api.payouts.withdrawals().catch(() => [] as PayoutRequest[]),
      ]);
      setWallet(w);
      setTxns(tx);
      setPayouts(wd);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { void load(); }, [load]);

  const alias = payouts.find((p) => p.destination)?.destination ?? user?.phone ?? '—';
  const initial = (user?.full_name ?? 'ر').charAt(0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — avatar (right) · المحفظة · bell (left) per Stitch _22 */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <Text style={s.brand}>{t('driver.wallet')}</Text>
        <Pressable hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Navy balance card */}
        <View style={s.balanceCard}>
          <View style={s.glow} />
          <Text style={s.balanceLabel}>{t('driver.availableBalance')}</Text>
          <Text style={s.balanceValue}>
            {wallet ? wallet.balance_jod.toFixed(2) : '0.00'} <Text style={s.balanceCur}>د.أ</Text>
          </Text>
          <Pressable onPress={() => router.push('/(app)/withdraw')} style={({ pressed }) => [s.withdrawBtn, pressed && { opacity: 0.9 }]}>
            <Icon name="home" size={18} color={theme.colors.onAccent} />
            <Text style={s.withdrawText}>{t('driver.withdrawBalance')}</Text>
          </Pressable>
        </View>

        {/* CliQ payment info — icon circle (right) + text · edit (left) per Stitch _22 */}
        <Pressable onPress={() => router.push('/(app)/withdraw')} style={s.cliqCard}>
          <View style={s.cliqIcon}>
            <Icon name="credit-card" size={20} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cliqTitle}>{t('driver.cliqPaymentInfo')}</Text>
            <Text style={s.cliqSub}>{t('driver.cliqAliasLabel')}: {alias}</Text>
          </View>
          <Icon name="edit-2" size={18} color={theme.colors.primary} />
        </Pressable>

        {/* Earnings details (daily/weekly breakdown) */}
        <Pressable onPress={() => router.push('/(app)/earnings-detail')} style={({ pressed }) => [s.detailsLink, pressed && { opacity: 0.9 }]}>
          <View style={s.detailsIcon}>
            <Icon name="bar-chart-2" size={20} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cliqTitle}>{t('driver.earningsDetails')}</Text>
            <Text style={s.cliqSub}>{t('driver.viewEarningsDetails')}</Text>
          </View>
          <Icon name="chevron-left" size={20} color={theme.colors.muted} />
        </Pressable>

        {/* Recent transactions */}
        <Text style={s.section}>{t('driver.recentTransactions')}</Text>
        {loading ? (
          <SkeletonList rows={3} />
        ) : loadError ? (
          <ErrorState title={t('common.error')} message={t('common.loadFailed')} retryLabel={t('common.retry')} onRetry={() => void load()} />
        ) : txns.length === 0 ? (
          <EmptyState icon="credit-card" title={t('wallet.noTransactions')} />
        ) : (
          txns.map((tx) => {
            const positive = tx.amount_fils >= 0;
            const v = txnVisual(tx.type ?? '', positive);
            const tint = v.navy ? theme.colors.primary : theme.colors.accent;
            return (
              <View key={tx.id} style={s.txn}>
                <View style={[s.txnIcon, { backgroundColor: tint + '1A' }]}>
                  <Icon name={v.icon} size={18} color={tint} />
                </View>
                <View style={s.txnBody}>
                  <Text style={s.txnType}>{tx.type_label}</Text>
                  {tx.created_at && <Text style={s.meta}>{new Date(tx.created_at).toLocaleString(locale)}</Text>}
                </View>
                <Text style={[s.txnAmount, { color: positive ? theme.colors.accent : theme.colors.text }]}>
                  {positive ? '+ ' : '- '}{Math.abs(tx.amount_jod).toFixed(2)} د.أ
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
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 32, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    balanceCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.xl, padding: t.spacing.lg, overflow: 'hidden', ...t.shadow.md },
    glow: { position: 'absolute', top: -40, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: t.colors.accent, opacity: 0.12 },
    balanceLabel: { fontFamily: t.fontFamily.regular, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
    balanceValue: { fontFamily: t.fontFamily.extrabold, fontSize: 40, color: '#FFFFFF', textAlign: 'center', marginTop: 4 },
    balanceCur: { fontFamily: t.fontFamily.bold, fontSize: 18, color: 'rgba(255,255,255,0.85)' },
    withdrawBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.accent, borderRadius: t.radius.md, height: 52, marginTop: t.spacing.base },
    withdrawText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.onAccent },

    cliqCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, marginTop: t.spacing.md, ...t.shadow.sm },
    detailsLink: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, marginTop: t.spacing.md, ...t.shadow.sm },
    detailsIcon: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    cliqTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    cliqSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    cliqIcon: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

    section: { fontFamily: t.fontFamily.bold, fontSize: 20, color: t.colors.primary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.md },
    txn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.md, marginBottom: t.spacing.sm },
    txnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    txnBody: { flex: 1 },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    txnAmount: { fontFamily: t.fontFamily.extrabold, fontSize: 15 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
  });
