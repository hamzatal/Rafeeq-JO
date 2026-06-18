import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Wallet, WalletTransaction } from '@rafeeq/shared';
import { EmptyState, SectionTitle, StatCard } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Earnings() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [w, tx] = await Promise.all([api.wallet.show(), api.wallet.transactions()]);
        setWallet(w);
        setTxns(tx);
      } catch {
        /* silent */
      }
    })();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('driver.earnings')}</Text>

        <StatCard label={t('driver.balance')} value={`${wallet ? wallet.balance_jod.toFixed(3) : '—'} JOD`} icon="credit-card" />

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
    txn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.md, marginBottom: t.spacing.sm },
    txnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    txnBody: { flex: 1 },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    txnAmount: { fontFamily: t.fontFamily.extrabold, fontSize: 15 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
  });
