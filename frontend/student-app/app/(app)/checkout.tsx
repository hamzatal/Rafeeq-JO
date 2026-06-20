import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CliqInstructions, PaymentRequest } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { Icon } from '../../src/components/Icon';
import { KeyValue } from '../../src/components/kit';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { pickProof } from '../../src/lib/proof';
import { useTheme, type AppTheme } from '../../src/theme';

type Step = 'review' | 'instructions' | 'done';

export default function Checkout() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const params = useLocalSearchParams<{
    planId: string;
    name?: string;
    price?: string;
    includes?: string;
  }>();

  const [step, setStep] = useState<Step>('review');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [instructions, setInstructions] = useState<CliqInstructions | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const priceLabel = `${params.price ?? '—'} ${t('subscriptions.currency')}`;

  // Subscribe (creates a pending subscription) → create a subscription payment
  // → show CliQ transfer instructions. This is the real, wired payment step.
  const subscribeAndPay = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const sub = await api.transport.subscribe(params.planId);
      const { request, instructions: ins } = await api.payments.create({
        purpose: 'subscription',
        subscription_id: sub.id,
      });
      setPayment(request);
      setInstructions(ins);
      setStep('instructions');
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('checkout.failed'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const uploadReceipt = async () => {
    if (!payment) return;
    const file = await pickProof();
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('proof', file as Blob);
      await api.payments.submitProof(payment.id, fd);
      setStep('done');
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('checkout.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {/* Summary (always visible) */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('checkout.summary')}</Text>
          <KeyValue label={t('checkout.includes')} value={params.name ?? t('subscriptions.defaultName')} />
          {params.includes ? <KeyValue label=" " value={params.includes} /> : null}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{t('checkout.total')}</Text>
            <Text style={s.totalValue}>{priceLabel}</Text>
          </View>
        </View>

        {step === 'review' && (
          <Button title={t('checkout.subscribeAndPay')} icon="credit-card" onPress={subscribeAndPay} loading={busy} style={s.cta} />
        )}

        {step === 'instructions' && instructions && (
          <>
            <View style={[s.card, { borderColor: theme.colors.primary }]}>
              <View style={s.cliqHead}>
                <Icon name="info" size={18} color={theme.colors.primary} />
                <Text style={s.cardTitle}>{t('wallet.cliqTitle')}</Text>
              </View>
              <KeyValue label={t('wallet.alias')} value={instructions.alias ?? '—'} />
              <KeyValue label={t('wallet.beneficiary')} value={instructions.beneficiary ?? '—'} />
              {instructions.bank ? <KeyValue label={t('wallet.bank')} value={instructions.bank} /> : null}
              <KeyValue label={t('wallet.amount')} value={`${instructions.amount_jod} ${t('subscriptions.currency')}`} strong />
              <KeyValue label={t('wallet.reference')} value={instructions.reference} />
              <Text style={s.hint}>{t('checkout.payHint')}</Text>
            </View>
            <Button title={t('checkout.transferred')} icon="upload" onPress={uploadReceipt} loading={uploading} style={s.cta} />
          </>
        )}

        {step === 'done' && (
          <View style={s.doneWrap}>
            <View style={s.doneIcon}>
              <Icon name="clock" size={40} color={theme.colors.warning} />
            </View>
            <Text style={s.doneTitle}>{t('checkout.pendingTitle')}</Text>
            <Text style={s.doneBody}>{t('checkout.pendingBody')}</Text>
            <Button title={t('checkout.viewSubscriptions')} onPress={() => router.replace('/(app)/subscriptions')} style={s.cta} />
            <Button title={t('checkout.goWallet')} variant="ghost" onPress={() => router.replace('/(app)/wallet')} style={{ marginTop: theme.spacing.sm }} />
          </View>
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
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.lg, marginBottom: t.spacing.base, ...t.shadow.sm },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    cliqHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: t.spacing.sm },
    totalRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: t.spacing.sm, paddingTop: t.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.border },
    totalLabel: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    totalValue: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.primary },
    hint: { fontFamily: t.fontFamily.regular, fontSize: 13, lineHeight: 20, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.sm },
    cta: { marginTop: t.spacing.sm },
    doneWrap: { alignItems: 'center', paddingTop: t.spacing.xl, gap: t.spacing.sm },
    doneIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: t.colors.warningSoft, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm },
    doneTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text, textAlign: 'center' },
    doneBody: { fontFamily: t.fontFamily.regular, fontSize: 14, lineHeight: 22, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 320, marginBottom: t.spacing.base },
  });
