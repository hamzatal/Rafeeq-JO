import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CliqInstructions, Wallet, WalletTransaction } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function WalletScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [amount, setAmount] = useState('');
  const [instructions, setInstructions] = useState<CliqInstructions | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      const [w, tx] = await Promise.all([api.wallet.show(), api.wallet.transactions()]);
      setWallet(w);
      setTxns(tx);
    } catch {
      /* handled by banner on actions */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const topup = async () => {
    const jod = Number(amount);
    if (!Number.isFinite(jod) || jod < 1) {
      setMsg({ text: t('wallet.invalidAmount'), ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const ins = await api.wallet.topupInstructions(Math.round(jod * 1000));
      setInstructions(ins);
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={s.h1}>{t('wallet.title')}</Text>
      {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={s.balanceValue}>{wallet ? wallet.balance_jod.toFixed(3) : '—'} {t('subscriptions.currency')}</Text>
      </View>

      <Text style={s.section}>{t('wallet.topup')}</Text>
      <Input
        label={t('wallet.amount')}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="5"
      />
      <Button title={t('wallet.getInstructions')} onPress={topup} loading={busy} />

      {instructions && (
        <View style={s.cliqCard}>
          <Text style={s.cliqTitle}>{t('wallet.cliqTitle')}</Text>
          <Row label={t('wallet.alias')} value={instructions.alias ?? '—'} s={s} />
          <Row label={t('wallet.beneficiary')} value={instructions.beneficiary ?? '—'} s={s} />
          <Row label={t('wallet.bank')} value={instructions.bank ?? '—'} s={s} />
          <Row label={t('wallet.amount')} value={`${instructions.amount_jod} ${t('subscriptions.currency')}`} s={s} />
          <Row label={t('wallet.reference')} value={instructions.reference} s={s} />
          <Text style={s.note}>{instructions.note ?? t('wallet.afterTransfer')}</Text>
        </View>
      )}

      <Text style={s.section}>{t('wallet.transactions')}</Text>
      {txns.length === 0 ? (
        <Text style={s.meta}>{t('wallet.noTransactions')}</Text>
      ) : (
        txns.map((tx) => (
          <View key={tx.id} style={s.txn}>
            <View style={s.row}>
              <Text style={s.txnType}>{tx.type_label}</Text>
              <Text style={[s.txnAmount, { color: tx.amount_fils >= 0 ? theme.colors.success : theme.colors.danger }]}>
                {tx.amount_fils >= 0 ? '+' : ''}{tx.amount_jod.toFixed(3)} {t('subscriptions.currency')}
              </Text>
            </View>
            {tx.created_at && <Text style={s.meta}>{new Date(tx.created_at).toLocaleString(locale)}</Text>}
          </View>
        ))
      )}
    </Screen>
  );
}

function Row({ label, value, s }: { label: string; value: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.sm },
    balanceCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.lg, padding: t.spacing.lg, alignItems: 'center' },
    balanceLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.onPrimary, opacity: 0.9 },
    balanceValue: { fontFamily: t.fontFamily.extrabold, fontSize: 34, color: t.colors.onPrimary, marginTop: 4 },
    cliqCard: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginTop: t.spacing.base },
    cliqTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    rowLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary },
    rowValue: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },
    note: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'right', marginTop: t.spacing.xs },
    txn: { backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },
    txnAmount: { fontFamily: t.fontFamily.bold, fontSize: 14 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right' },
  });
