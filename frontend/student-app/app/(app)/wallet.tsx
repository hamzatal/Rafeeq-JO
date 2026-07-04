import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CliqInstructions, PaymentRequest, Wallet, WalletTransaction } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card, EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { Chip, Skeleton } from '../../src/components/kit';
import { Icon } from '../../src/components/Icon';
import { useToast } from '../../src/components/Feedback';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { pickProof } from '../../src/lib/proof';
import { useTheme, type AppTheme } from '../../src/theme';

const PRESETS = [5, 10, 20, 50];

export default function WalletScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  // The freshly created top-up (request + its CliQ instructions) — drives the
  // inline "transfer then upload" guide so the user never loses the thread.
  const [active, setActive] = useState<{ request: PaymentRequest; instructions: CliqInstructions } | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, tx, pays] = await Promise.all([
        api.wallet.show(),
        api.wallet.transactions(),
        api.payments.mine().catch(() => [] as PaymentRequest[]),
      ]);
      setWallet(w);
      setTxns(tx);
      setPayments(pays);
    } catch {
      /* surfaced on actions */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTopup = async () => {
    const jod = Number(amount);
    if (!Number.isFinite(jod) || jod < 1) {
      toast.error(t('wallet.invalidAmount'));
      return;
    }
    setCreating(true);
    try {
      const res = await api.payments.create({ purpose: 'wallet_topup', amount_fils: Math.round(jod * 1000) });
      setActive(res);
      setAmount('');
      toast.success(t('wallet.topupCreated'));
      await load();
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const uploadProof = async (id: string) => {
    const file = await pickProof();
    if (!file) return;
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append('proof', file as Blob);
      await api.payments.submitProof(id, fd);
      toast.success(t('payments.proofUploaded'));
      setActive(null);
      await load();
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setUploadingId(null);
    }
  };

  const canUpload = (status: string) => ['pending', 'submitted', 'under_review'].includes(status);
  const payTone = (status: string) => (status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'primary');
  // Pending requests that still need the user to act (upload a receipt).
  const pending = payments.filter((p) => canUpload(p.status) && p.id !== active?.request.id);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('wallet.title')}</Text>

        {/* Premium wallet card */}
        <View style={s.walletCard}>
          <View style={s.glow} />
          <View style={s.walletTop}>
            <View style={s.brandChip}>
              <Icon name="zap" size={13} color={theme.colors.onAccent} />
              <Text style={s.brandChipText}>رفيق</Text>
            </View>
            <Icon name="credit-card" size={24} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={s.walletLabel}>{t('wallet.balance')}</Text>
          {loading ? (
            <Skeleton width={160} height={44} radius={10} style={{ marginTop: 6, alignSelf: 'flex-end' }} />
          ) : (
            <Text style={s.walletValue}>
              {wallet ? wallet.balance_jod.toFixed(3) : '—'}
              <Text style={s.walletCur}> {t('subscriptions.currency')}</Text>
            </Text>
          )}
          <Text style={s.walletMask}>•••• •••• •••• {(wallet?.id ?? 'RFQ0').slice(-4).toUpperCase()}</Text>
        </View>

        {/* Guided top-up */}
        {active ? (
          <TopupGuide
            data={active}
            uploading={uploadingId === active.request.id}
            onUpload={() => uploadProof(active.request.id)}
            onDismiss={() => setActive(null)}
            s={s}
            t={t}
            theme={theme}
          />
        ) : (
          <>
            <SectionTitle title={t('wallet.topup')} />
            <Card>
              <Text style={s.fieldLabel}>{t('wallet.chooseAmount')}</Text>
              <View style={s.presets}>
                {PRESETS.map((p) => (
                  <Chip
                    key={p}
                    label={`${p} ${t('subscriptions.currency')}`}
                    selected={Number(amount) === p}
                    onPress={() => setAmount(String(p))}
                  />
                ))}
              </View>
              <View style={{ height: theme.spacing.sm }} />
              <Input label={t('wallet.amount')} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="5" />
              <Button title={t('wallet.topupCta')} icon="arrow-left" onPress={createTopup} loading={creating} />
            </Card>
          </>
        )}

        {/* Pending top-ups still awaiting a receipt */}
        {pending.length > 0 && (
          <>
            <SectionTitle title={t('wallet.paymentRequests')} />
            {pending.map((p) => (
              <Card key={p.id}>
                <View style={s.payHead}>
                  <Text style={s.payNumber}>{p.purpose_label}</Text>
                  <Badge label={p.status === 'pending' ? t('wallet.awaitingProof') : t('wallet.underReview')} tone={payTone(p.status)} />
                </View>
                <Text style={s.meta}>{p.amount_jod.toFixed(3)} {t('subscriptions.currency')} · {p.number}</Text>
                {p.reject_reason ? <Text style={[s.meta, { color: theme.colors.danger }]}>{p.reject_reason}</Text> : null}
                <Pressable onPress={() => uploadProof(p.id)} style={s.uploadBtn}>
                  <Icon name="upload" size={16} color={theme.colors.primary} />
                  <Text style={s.uploadText}>{uploadingId === p.id ? '...' : t('wallet.uploadProof')}</Text>
                </Pressable>
              </Card>
            ))}
          </>
        )}

        {/* Transactions */}
        <SectionTitle title={t('wallet.transactions')} />
        {loading ? (
          <View style={{ gap: theme.spacing.sm }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={64} radius={theme.radius.lg} />
            ))}
          </View>
        ) : txns.length === 0 ? (
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

/** Inline 3-step guide shown right after a top-up request is created. */
function TopupGuide({
  data,
  uploading,
  onUpload,
  onDismiss,
  s,
  t,
  theme,
}: {
  data: { request: PaymentRequest; instructions: CliqInstructions };
  uploading: boolean;
  onUpload: () => void;
  onDismiss: () => void;
  s: ReturnType<typeof makeStyles>;
  t: (k: string) => string;
  theme: AppTheme;
}) {
  const { instructions: ins } = data;
  return (
    <Card style={{ borderColor: theme.colors.accent, borderWidth: 1.5 }}>
      <View style={s.guideHead}>
        <Text style={s.guideTitle}>{t('wallet.newTopup')}</Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Icon name="x" size={18} color={theme.colors.muted} />
        </Pressable>
      </View>

      {/* Step 1 — done */}
      <StepRow n={1} done label={`${data.request.amount_jod.toFixed(3)} ${t('subscriptions.currency')}`} s={s} theme={theme} />
      {/* Step 2 — transfer via CliQ */}
      <StepRow n={2} label={t('wallet.transferStep')} s={s} theme={theme} />
      <View style={s.cliqBox}>
        <Row label={t('wallet.alias')} value={ins.alias ?? '—'} s={s} />
        <Row label={t('wallet.beneficiary')} value={ins.beneficiary ?? '—'} s={s} />
        <Row label={t('wallet.amount')} value={`${ins.amount_jod} ${t('subscriptions.currency')}`} s={s} />
        <Row label={t('wallet.reference')} value={ins.reference} s={s} />
      </View>
      {/* Step 3 — upload */}
      <StepRow n={3} label={t('wallet.uploadStep')} s={s} theme={theme} />
      <Button title={t('wallet.uploadProof')} icon="upload" onPress={onUpload} loading={uploading} />
    </Card>
  );
}

function StepRow({ n, label, done, s, theme }: { n: number; label: string; done?: boolean; s: ReturnType<typeof makeStyles>; theme: AppTheme }) {
  return (
    <View style={s.stepRow}>
      <View style={[s.stepDot, done && { backgroundColor: theme.colors.success, borderColor: theme.colors.success }]}>
        {done ? <Icon name="check" size={13} color={theme.colors.textInverse} /> : <Text style={s.stepNum}>{n}</Text>}
      </View>
      <Text style={s.stepLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, value, s }: { label: string; value: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} selectable>{value}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },

    walletCard: { backgroundColor: t.colors.primary, borderRadius: t.radius['2xl'], padding: t.spacing.lg, overflow: 'hidden', marginBottom: t.spacing.md, ...t.shadow.lg },
    glow: { position: 'absolute', top: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: t.colors.accent, opacity: 0.14 },
    walletTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.lg },
    brandChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: t.colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.full },
    brandChipText: { fontFamily: t.fontFamily.extrabold, fontSize: 12, color: t.colors.onAccent },
    walletLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
    walletValue: { fontFamily: t.fontFamily.extrabold, fontSize: 40, color: t.colors.accent, textAlign: 'right', marginTop: 2 },
    walletCur: { fontFamily: t.fontFamily.bold, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    walletMask: { fontFamily: t.fontFamily.medium, fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'right', marginTop: t.spacing.md, letterSpacing: 2 },

    fieldLabel: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    presets: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm },

    guideHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    guideTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.text },
    stepRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, marginTop: t.spacing.sm },
    stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.accent, alignItems: 'center', justifyContent: 'center' },
    stepNum: { fontFamily: t.fontFamily.extrabold, fontSize: 12, color: t.colors.accent },
    stepLabel: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    cliqBox: { backgroundColor: t.colors.hairline, borderRadius: t.radius.md, padding: t.spacing.md, marginVertical: t.spacing.sm, marginRight: 32 },

    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    rowLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary },
    rowValue: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },

    txn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.xl, padding: t.spacing.base, marginBottom: t.spacing.sm, ...t.shadow.sm },
    txnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    txnBody: { flex: 1 },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    txnAmount: { fontFamily: t.fontFamily.extrabold, fontSize: 15 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
    payHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    payNumber: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    uploadBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: t.spacing.sm, borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10 },
    uploadText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
  });
