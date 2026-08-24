import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { CliqInstructions, PaymentRequest, Wallet, WalletTransaction } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Card, EmptyState, Badge } from '../../src/components/ui';
import { Skeleton } from '../../src/components/kit';
import { Icon, type IconName } from '../../src/components/Icon';
import { useToast } from '../../src/components/Feedback';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { pickProof } from '../../src/lib/proof';
import { useTheme, type AppTheme } from '../../src/theme';

/** Map a wallet transaction type to a Stitch icon + tone. */
function txnVisual(type: string, positive: boolean): { icon: IconName; tint: 'danger' | 'success' | 'primary' } {
  if (type.includes('reward') || type.includes('point')) return { icon: 'star', tint: 'success' };
  if (type.includes('refund')) return { icon: 'corner-up-left', tint: 'primary' };
  if (type.includes('trip') || type.includes('ride') || type.includes('payout')) return { icon: 'navigation', tint: positive ? 'success' : 'danger' };
  return { icon: positive ? 'arrow-down-left' : 'arrow-up-right', tint: positive ? 'success' : 'danger' };
}

export default function WalletScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const router = useRouter();
  const user = useAuth((st) => st.user);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
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
  const pending = payments.filter((p) => canUpload(p.status) && p.id !== active?.request.id);
  const initial = (user?.full_name ?? 'ر').charAt(0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — avatar (right) · Rafeeq · bell (left) per Stitch _18 */}
      <View style={s.header}>
        <Pressable onPress={() => router.push('/(app)/settings')} hitSlop={8} style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </Pressable>
        <Text style={s.brand}>رفيق</Text>
        <Pressable onPress={() => router.push('/(app)/notifications')} hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Balance card — decorative blurred blob top-right per Stitch _18 */}
        <View style={s.balanceCard}>
          <View style={s.balanceBlob} pointerEvents="none" />
          <Text style={s.balanceLabel}>{t('wallet.balance')}</Text>
          {loading ? (
            <Skeleton width={170} height={44} radius={10} style={{ alignSelf: 'center', marginVertical: 6 }} />
          ) : (
            <Text style={s.balanceValue}>
              <Text style={s.balanceCur}>JOD </Text>
              {wallet ? wallet.balance_jod.toFixed(2) : '0.00'}
            </Text>
          )}
          <Button title={t('wallet.topupCta')} icon="plus-circle" onPress={createTopup} loading={creating} style={{ marginTop: theme.spacing.base }} />
        </View>

        {/* Guided top-up OR CliQ request card */}
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
          <View style={s.cliqCard}>
            <View style={s.cliqHead}>
              <View style={s.cliqIcon}>
                <Icon name="grid" size={22} color={theme.colors.accent} />
              </View>
              <View>
                <Text style={s.cliqTitle}>{t('wallet.cliqTitle')}</Text>
                <Pressable hitSlop={6} style={s.cliqLinkRow}>
                  <Text style={s.cliqLink}>{t('wallet.cliqHowTo')}</Text>
                  <Icon name="help-circle" size={13} color={theme.colors.accent} />
                </Pressable>
              </View>
            </View>
            <View style={s.amountRow}>
              <Text style={s.amountCur}>JOD</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder={t('wallet.enterAmount')}
                placeholderTextColor={theme.colors.muted}
                style={s.amountInput}
                textAlign="right"
              />
            </View>
            <Pressable onPress={createTopup} style={({ pressed }) => [s.cliqBtn, pressed && { opacity: 0.85 }]} disabled={creating}>
              <Icon name="link" size={18} color={theme.colors.primary} />
              <Text style={s.cliqBtnText}>{creating ? '...' : t('wallet.createLink')}</Text>
            </Pressable>
          </View>
        )}

        {/* Pending top-ups still awaiting a receipt */}
        {pending.length > 0 &&
          pending.map((p) => (
            <Card key={p.id} style={{ marginTop: theme.spacing.md }}>
              <View style={s.payHead}>
                <Text style={s.payNumber}>{p.purpose_label}</Text>
                <Badge label={p.status === 'pending' ? t('wallet.awaitingProof') : t('wallet.underReview')} tone={payTone(p.status)} />
              </View>
              <Text style={s.meta}>{p.amount_jod.toFixed(2)} {t('subscriptions.currency')} · {p.number}</Text>
              {p.reject_reason ? <Text style={[s.meta, { color: theme.colors.danger }]}>{p.reject_reason}</Text> : null}
              <Pressable onPress={() => uploadProof(p.id)} style={s.uploadBtn}>
                <Icon name="upload" size={16} color={theme.colors.primary} />
                <Text style={s.uploadText}>{uploadingId === p.id ? '...' : t('wallet.uploadProof')}</Text>
              </Pressable>
            </Card>
          ))}

        {/* Transactions */}
        <View style={s.txnHead}>
          <Text style={s.sectionTitle}>{t('wallet.transactions')}</Text>
          <Pressable hitSlop={6}>
            <Text style={s.viewAll}>{t('common.viewAll')}</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={{ gap: theme.spacing.sm }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={68} radius={theme.radius.lg} />
            ))}
          </View>
        ) : txns.length === 0 ? (
          <EmptyState icon="credit-card" title={t('wallet.noTransactions')} />
        ) : (
          txns.map((tx) => {
            const positive = tx.amount_fils >= 0;
            const v = txnVisual(tx.type ?? '', positive);
            const tint = theme.colors[v.tint];
            return (
              <View key={tx.id} style={s.txn}>
                <View style={[s.txnIcon, { backgroundColor: tint + '1A' }]}>
                  <Icon name={v.icon} size={18} color={tint} />
                </View>
                <View style={s.txnBody}>
                  <Text style={s.txnType}>{tx.type_label}</Text>
                  {tx.created_at && <Text style={s.meta}>{new Date(tx.created_at).toLocaleString(locale)}</Text>}
                </View>
                <Text style={[s.txnAmount, { color: positive ? theme.colors.success : theme.colors.danger }]}>
                  {positive ? '+ ' : '- '}{Math.abs(tx.amount_jod).toFixed(2)}
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
    <View style={s.cliqCard}>
      <View style={s.guideHead}>
        <Text style={s.guideTitle}>{t('wallet.newTopup')}</Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Icon name="x" size={18} color={theme.colors.muted} />
        </Pressable>
      </View>
      <StepRow n={1} done label={`${data.request.amount_jod.toFixed(2)} ${t('subscriptions.currency')}`} s={s} theme={theme} />
      <StepRow n={2} label={t('wallet.transferStep')} s={s} theme={theme} />
      <View style={s.cliqBox}>
        <Row label={t('wallet.alias')} value={ins.alias ?? '—'} s={s} />
        <Row label={t('wallet.beneficiary')} value={ins.beneficiary ?? '—'} s={s} />
        <Row label={t('wallet.amount')} value={`${ins.amount_jod} ${t('subscriptions.currency')}`} s={s} />
        <Row label={t('wallet.reference')} value={ins.reference} s={s} />
      </View>
      <StepRow n={3} label={t('wallet.uploadStep')} s={s} theme={theme} />
      <Button title={t('wallet.uploadProof')} icon="upload" onPress={onUpload} loading={uploading} />
    </View>
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
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.onPrimary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    balanceCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.surfaceHighest, padding: t.spacing.lg, alignItems: 'center', overflow: 'hidden', ...t.shadow.md },
    balanceBlob: { position: 'absolute', top: -64, right: -64, width: 128, height: 128, borderRadius: 64, backgroundColor: t.colors.onPrimaryMuted, opacity: 0.2 },
    balanceLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary },
    balanceValue: { fontFamily: t.fontFamily.extrabold, fontSize: 40, color: t.colors.primary, marginTop: 4 },
    balanceCur: { fontFamily: t.fontFamily.bold, fontSize: 22, color: t.colors.primary },

    cliqCard: { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.xl, padding: t.spacing.lg, marginTop: t.spacing.md },
    cliqHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: t.spacing.sm, marginBottom: t.spacing.base },
    cliqTitle: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.primary, textAlign: 'right' },
    cliqLinkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
    cliqLink: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.accent, textAlign: 'right' },
    cliqIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.accentBright, alignItems: 'center', justifyContent: 'center' },
    amountRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.hairline, paddingHorizontal: t.spacing.base, height: 54, marginBottom: t.spacing.md },
    amountInput: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    amountCur: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.textSecondary },
    cliqBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: t.radius.md, borderWidth: 2, borderColor: t.colors.primary, backgroundColor: 'transparent' },
    cliqBtnText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.primary },

    guideHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    guideTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    stepRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, marginTop: t.spacing.sm },
    stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.accent, alignItems: 'center', justifyContent: 'center' },
    stepNum: { fontFamily: t.fontFamily.extrabold, fontSize: 12, color: t.colors.accent },
    stepLabel: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    cliqBox: { backgroundColor: t.colors.surface, borderRadius: t.radius.md, padding: t.spacing.md, marginVertical: t.spacing.sm, marginRight: 32 },

    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    rowLabel: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary },
    rowValue: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },

    sectionTitle: { fontFamily: t.fontFamily.bold, fontSize: 20, color: t.colors.primary, textAlign: 'right' },
    viewAll: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.accent },
    txnHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: t.spacing.lg, marginBottom: t.spacing.md },
    txn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.md, marginBottom: t.spacing.sm },
    txnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    txnBody: { flex: 1 },
    txnType: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    txnAmount: { fontFamily: t.fontFamily.extrabold, fontSize: 15 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
    payHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    payNumber: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    uploadBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: t.spacing.sm, borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10 },
    uploadText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
  });
