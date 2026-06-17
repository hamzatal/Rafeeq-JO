import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Wallet, WalletTransaction } from '@rafeeq/shared';
import { Screen } from '../../src/components/Screen';
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
    <Screen scroll>
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>{t('driver.balance')}</Text>
        <Text style={s.balanceValue}>{wallet ? wallet.balance_jod.toFixed(3) : '—'} JOD</Text>
      </View>

      <Text style={s.section}>{t('wallet.transactions')}</Text>
      {txns.length === 0 ? (
        <Text style={s.meta}>{t('wallet.noTransactions')}</Text>
      ) : (
        txns.map((tx) => (
          <View key={tx.id} style={s.txn}>
            <View style={s.row}>
              <Text style={s.txnType}>{tx.type_label}</Text>
              <Text style={[s.txnAmount, { color: tx.amount_fils >= 0 ? theme.colors.success : theme.colors.danger }]}>
                {tx.amount_fils >= 0 ? '+' : ''}{tx.amount_jod.toFixed(3)} JOD
              </Text>
            </View>
            {tx.created_at && <Text style={s.meta}>{new Date(tx.created_at).toLocaleString(locale)}</Text>}
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    balanceCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.lg, padding: t.spacing.lg, alignItems: 'center', marginBottom: t.spacing.base },
    balanceLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.onPrimary, opacity: 0.9 },
    balanceValue: { fontFamily: t.fontFamily.extrabold, fontSize: 34, color: t.colors.onPrimary, marginTop: 4 },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    txn: { backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },
    txnAmount: { fontFamily: t.fontFamily.bold, fontSize: 14 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right' },
  });
