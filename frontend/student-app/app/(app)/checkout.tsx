import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type Step = 'review' | 'instructions' | 'pending' | 'active';

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
  const [busy, setBusy] = useState<null | 'wallet' | 'cliq'>(null);
  const [uploading, setUploading] = useState(false);
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [instructions, setInstructions] = useState<CliqInstructions | null>(null);
  const [balanceJod, setBalanceJod] = useState<number | null>(null);
  const [proofFile, setProofFile] = useState<{ uri: string } | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const priceJod = Number(params.price ?? '0');
  const priceLabel = `${params.price ?? '—'} ${t('subscriptions.currency')}`;
  const canWallet = balanceJod != null && balanceJod >= priceJod && priceJod > 0;

  useEffect(() => {
    api.wallet.show().then((w) => setBalanceJod(w.balance_jod)).catch(() => setBalanceJod(null));
  }, []);

  // Pay directly from wallet balance → instant activation.
  const payWallet = async () => {
    setBusy('wallet');
    setMsg(null);
    try {
      const sub = await api.transport.subscribe(params.planId);
      await api.transport.paySubscriptionFromWallet(sub.id);
      setStep('active');
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('checkout.failed'), ok: false });
    } finally {
      setBusy(null);
    }
  };

  // Pay via CliQ transfer → create a subscription payment + show instructions.
  const payCliq = async () => {
    setBusy('cliq');
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
      setBusy(null);
    }
  };

  // Step 1: pick the transfer screenshot (preview only). Step 2: confirm → submit.
  const pickFile = async () => {
    const file = await pickProof();
    if (file && 'uri' in (file as object)) setProofFile({ uri: (file as unknown as { uri: string }).uri });
  };

  const copyAlias = () => setMsg({ text: t('checkout.copied'), ok: true });

  const confirmPay = async () => {
    if (!payment) return;
    if (!proofFile) {
      setMsg({ text: t('checkout.uploadTransfer'), ok: false });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('proof', proofFile as unknown as Blob);
      await api.payments.submitProof(payment.id, fd);
      setStep('pending');
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setUploading(false);
    }
  };

  const expiryText = (() => {
    if (!payment?.expires_at) return '';
    const h = Math.round((new Date(payment.expires_at).getTime() - Date.now()) / 3600000);
    return h > 0 ? `${t('checkout.expiresAfter')} ${h} ${t('checkout.hours')}` : t('checkout.expired');
  })();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('checkout.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {/* Summary */}
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
          <>
            <Text style={s.choose}>{t('checkout.choosePay')}</Text>

            {/* Pay from wallet */}
            <Pressable
              onPress={canWallet ? payWallet : undefined}
              disabled={!canWallet || busy !== null}
              style={({ pressed }) => [s.method, canWallet && s.methodOn, pressed && canWallet && s.pressed]}
            >
              <View style={[s.methodIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Icon name="credit-card" size={22} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.methodTitle}>{t('checkout.payFromWallet')}</Text>
                <Text style={[s.methodSub, !canWallet && { color: theme.colors.danger }]}>
                  {balanceJod == null
                    ? '—'
                    : canWallet
                      ? `${t('checkout.walletBalance')}: ${balanceJod.toFixed(3)} ${t('subscriptions.currency')}`
                      : t('checkout.insufficient')}
                </Text>
              </View>
              {busy === 'wallet' ? <Icon name="loader" size={20} color={theme.colors.primary} /> : <Icon name="chevron-left" size={20} color={theme.colors.muted} />}
            </Pressable>

            {/* Pay via CliQ */}
            <Pressable
              onPress={busy === null ? payCliq : undefined}
              disabled={busy !== null}
              style={({ pressed }) => [s.method, pressed && s.pressed]}
            >
              <View style={[s.methodIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name="smartphone" size={22} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.methodTitle}>{t('checkout.payViaCliqOption')}</Text>
                <Text style={s.methodSub}>{t('checkout.transferred')}</Text>
              </View>
              {busy === 'cliq' ? <Icon name="loader" size={20} color={theme.colors.primary} /> : <Icon name="chevron-left" size={20} color={theme.colors.muted} />}
            </Pressable>
          </>
        )}

        {step === 'instructions' && instructions && payment && (
          <>
            {/* Order card */}
            <View style={s.card}>
              <View style={s.orderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.orderLabel}>{t('checkout.orderNumber')}</Text>
                  <Text style={s.orderNumber}>{payment.number}</Text>
                </View>
                <View style={s.receiptIcon}>
                  <Icon name="file-text" size={20} color={theme.colors.primary} />
                </View>
              </View>
              <View style={s.cardDivider} />
              <Text style={s.orderLabel}>{t('checkout.amountDue')}</Text>
              <Text style={s.amountBig}>
                <Text style={s.amountCur}>JOD </Text>{Number(instructions.amount_jod).toFixed(2)}
              </Text>
              {expiryText ? (
                <View style={s.validityRow}>
                  <Text style={s.validityText}>{expiryText}</Text>
                  <Icon name="clock" size={14} color={theme.colors.accent} />
                  <Text style={s.validityLabel}>{t('checkout.validity')}</Text>
                </View>
              ) : null}
            </View>

            {/* Instructions card */}
            <View style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{t('checkout.payInstructions')}</Text>
                <Icon name="credit-card" size={18} color={theme.colors.primary} />
              </View>
              <Text style={s.instrText}>{t('checkout.transferInstruction')}</Text>
              <View style={s.aliasBox}>
                <Pressable onPress={copyAlias} hitSlop={8}>
                  <Icon name="copy" size={18} color={theme.colors.muted} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={s.aliasLabel}>{t('checkout.cliqAlias')}</Text>
                  <Text style={s.aliasValue} selectable>{instructions.alias ?? instructions.beneficiary ?? '—'}</Text>
                </View>
              </View>
            </View>

            {/* Proof of payment */}
            <View style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{t('checkout.proofTitle')}</Text>
                <Icon name="upload-cloud" size={18} color={theme.colors.accent} />
              </View>
              <Pressable onPress={pickFile} style={s.upload}>
                {proofFile ? (
                  <Image source={{ uri: proofFile.uri }} style={s.uploadPreview} resizeMode="cover" />
                ) : (
                  <>
                    <View style={s.uploadIcon}>
                      <Icon name="image" size={22} color={theme.colors.accent} />
                    </View>
                    <Text style={s.uploadHint}>{t('checkout.uploadTransfer')}</Text>
                    <Text style={s.uploadTypes}>{t('checkout.uploadTypes')}</Text>
                  </>
                )}
              </Pressable>
              <View style={s.aiNote}>
                <View style={{ flex: 1 }}>
                  <Text style={s.aiTitle}>{t('checkout.aiVerify')}</Text>
                  <Text style={s.aiHint}>{t('checkout.aiVerifyHint')}</Text>
                </View>
                <Icon name="zap" size={18} color={theme.colors.accent} />
              </View>
            </View>
          </>
        )}

        {step === 'pending' && (
          <View style={s.doneWrap}>
            <View style={[s.doneIcon, { backgroundColor: theme.colors.warningSoft }]}>
              <Icon name="clock" size={40} color={theme.colors.warning} />
            </View>
            <Text style={s.doneTitle}>{t('checkout.pendingTitle')}</Text>
            <Text style={s.doneBody}>{t('checkout.pendingBody')}</Text>
            <Button title={t('checkout.viewSubscriptions')} onPress={() => router.replace('/(app)/subscriptions')} style={s.cta} />
            <Button title={t('checkout.goWallet')} variant="ghost" onPress={() => router.replace('/(app)/wallet')} style={{ marginTop: theme.spacing.sm }} />
          </View>
        )}

        {step === 'active' && (
          <View style={s.doneWrap}>
            <View style={[s.doneIcon, { backgroundColor: theme.colors.successSoft }]}>
              <Icon name="check-circle" size={40} color={theme.colors.success} />
            </View>
            <Text style={s.doneTitle}>{t('checkout.activatedTitle')}</Text>
            <Text style={s.doneBody}>{t('checkout.activatedBody')}</Text>
            <Button title={t('checkout.viewSubscriptions')} onPress={() => router.replace('/(app)/subscriptions')} style={s.cta} />
            <Button title={t('home.requestRideCta')} variant="ghost" onPress={() => router.replace('/(app)/ride-request')} style={{ marginTop: theme.spacing.sm }} />
          </View>
        )}
      </ScrollView>

      {step === 'instructions' && (
        <View style={s.footer}>
          <Button title={t('checkout.confirmPay')} icon="check-circle" onPress={confirmPay} loading={uploading} />
        </View>
      )}
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
    choose: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.sm },
    method: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.md, ...t.shadow.sm },
    methodOn: { borderColor: t.colors.primary },
    methodIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    methodTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    methodSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    hint: { fontFamily: t.fontFamily.regular, fontSize: 13, lineHeight: 20, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.sm },
    cta: { marginTop: t.spacing.sm },
    pressed: { opacity: 0.9 },
    doneWrap: { alignItems: 'center', paddingTop: t.spacing.xl, gap: t.spacing.sm },
    doneIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm },
    doneTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text, textAlign: 'center' },
    doneBody: { fontFamily: t.fontFamily.regular, fontSize: 14, lineHeight: 22, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 320, marginBottom: t.spacing.base },

    // _10 order/instructions/proof
    orderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    orderLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    orderNumber: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: 2 },
    receiptIcon: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border, marginVertical: t.spacing.base },
    amountBig: { fontFamily: t.fontFamily.extrabold, fontSize: 34, color: t.colors.primary, textAlign: 'right', marginTop: 2 },
    amountCur: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.primary },
    validityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: t.spacing.sm },
    validityLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },
    validityText: { fontFamily: t.fontFamily.semibold, fontSize: 12, color: t.colors.accent, marginRight: 'auto' },

    cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: t.spacing.sm },
    instrText: { fontFamily: t.fontFamily.regular, fontSize: 14, lineHeight: 22, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.md },
    aliasBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: t.spacing.base },
    aliasLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right' },
    aliasValue: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary, textAlign: 'right', marginTop: 2 },

    upload: { borderWidth: 1.5, borderColor: t.colors.border, borderStyle: 'dashed', borderRadius: t.radius.md, paddingVertical: t.spacing.lg, alignItems: 'center', gap: 6, overflow: 'hidden', marginBottom: t.spacing.md },
    uploadIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    uploadHint: { fontFamily: t.fontFamily.semibold, fontSize: 13, color: t.colors.text },
    uploadTypes: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted },
    uploadPreview: { width: '100%', height: 150, borderRadius: t.radius.sm },
    aiNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, borderWidth: 1, borderColor: t.colors.accent, borderRadius: t.radius.md, padding: t.spacing.md, backgroundColor: t.colors.accentSoft },
    aiTitle: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.text, textAlign: 'right' },
    aiHint: { fontFamily: t.fontFamily.regular, fontSize: 12, lineHeight: 18, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    footer: { padding: t.spacing.lg, paddingTop: t.spacing.md, backgroundColor: t.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
  });
