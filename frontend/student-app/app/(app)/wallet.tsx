import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CliqInstructions, Wallet, WalletTransaction } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SectionTitle } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
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
      /* handled on actions */
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
      setInstructions(await api.wallet.topupInstructions(Math.round(jod * 1000)));
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('wallet.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {/* Premium wallet card */}
        <View style={s.walletCard}>
          <View style={s.glow} />
          <View style={s.walletTop}>
            <View style={s.brandChip}>
              <Icon name="zap" size={13} color={theme.colors.primary} />
              <Text style={s.brandChipText}>رفيق</Text>
            </View>
            <Icon name="credit-card" size={24} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={s.walletLabel}>{t('wallet.balance')}</Text>
          <Text style={s.walletValue}>
            {wallet ? wallet.balance_jod.toFixed(3) : '—'}
            <Text style={s.walletCur}> {t('subscriptions.currency')}</Text>
          </Text>
          <Text style={s.walletMask}>•••• •••• •••• {(wallet?.id ?? 'RFQ0').slice(-4).toUpperCase()}</Text>
        </View>

        <SectionTitle title={t('wallet.topup')} />
        <Card>
          <Input label={t('wallet.amount')} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="5" />
          <Button title={t('wallet.getInstructions')} onPress={topup} loading={busy} />
        </Card>

        {instructions && (
          <Card style={{ borderColor: theme.colors.primary }}>
            <View style={s.cliqHead}>
              <Icon name="info" size={18} color={theme.colors.primary} />
              <Text style={s.cliqTitle}>{t('wallet.cliqTitle')}</Text>
            </View>
            <Row label={t('wallet.alias')} value={instructions.alias ?? '—'} s={s} />
            <Row label={t('wallet.beneficiary')} value={instructions.beneficiary ?? '—'} s={s} />
            <Row label={t('wallet.amount')} value={`${instructions.amount_jod} ${t('subscriptions.currency')}`} s={s} />
            <Row label={t('wallet.reference')} value={instructions.reference} s={s} />
            <Text style={s.note}>{instructions.note ?? t('wallet.afterTransfer')}</Text>
          </Card>
        )}

        <SectionTitle title={t('wallet.transactions')} />
        {txns.length === 0 ? (
          <EmptyState icon="credit-card" title={t('wallet.noTransactions')} />
        ) : (
          txns.map((tx) => {
            const positive = tx.amount_fils >= 0;
            return (
              <View key={tx.id} style={s.txn}>
                <View style={[s.txnIcon, { backgroundColor: (positive ? theme.colors.success : theme.colors.danger) + '1A' }]}>
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
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },

    walletCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.xl, padding: t.spacing.lg, overflow: 'hidden', marginBottom: t.spacing.md, ...t.shadow.md },
    glow: { position: 'absolute', top: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: t.colors.accent, opacity: 0.12 },
    walletTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.lg },
    brandChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: t.colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.full },
    brandChipText: { fontFamily: t.fontFamily.extrabold, fontSize: 12, color: t.colors.primary },
    walletLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
    walletValue: { fontFamily: t.fontFamily.extrabold, fontSize: 40, color: t.colors.accent, textAlign: 'right', marginTop: 2 },
    walletCur: { fontFamily: t.fontFamily.bold, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    walletMask: { fontFamily: t.fontFamily.medium, fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'right', marginTop: t.spacing.md, letterSpacing: 2 },
    cliqHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: t.spacing.sm },
    cliqTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    rowLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary },
    rowValue: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },
    note: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'right', marginTop: t.spacing.xs },
    txn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.md, marginBottom: t.spacing.sm },
    txnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    txnBody: { flex: 1 },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    txnAmount: { fontFamily: t.fontFamily.extrabold, fontSize: 15 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
  });
