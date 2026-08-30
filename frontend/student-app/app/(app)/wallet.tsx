import { useCallback, useEffect, useMemo, useState } from 'react';
import { DINAR, bareJod, formatJod, formatJodSigned } from '@rafeeq/shared';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { CliqInstructions, PaymentRequest, Wallet, WalletTransaction } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  ListState,
  pickProof,
  Skeleton,
  Text,
  listLabels,
  statusFromError,
  useTheme,
  useToast,
  type AppTheme,
  type IconName,
  type ListStatus,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { saveInvoicePdf } from '../../src/lib/invoice';

/* ═══════════════════════════════════════════════════════════════════════════
   ONE MONEY SCREEN, because there was never a second thing to see.

   ── The screen this absorbed ───────────────────────────────────────────────

   `payments.tsx` (195 lines) called `api.payments.mine()`, `api.payments.create()`
   and `api.payments.submitProof()` — the same three calls this file already made,
   against the same three states. It rendered them as a separate tab called
   «المدفوعات», so a student wondering where their 5 dinars went had two screens to
   check and no way to know which one was authoritative.

   The two things it had that this one did not are now here: the FULL top-up history
   (this file showed only requests still awaiting a receipt) and the PDF receipt.

   ── Three controls that did nothing, and one that always failed ────────────

     • «متابعة الشحن» on the balance card called `createTopup()` — while the amount
       field lived in the card BELOW it. The amount was therefore always `''`, so the
       button's only possible outcome was «أدخل مبلغاً صحيحاً». It is gone; the CliQ
       card immediately below is the top-up flow, and there is now one of it.
     • «تعرف على طريقة الاستخدام» was a `Pressable` with no `onPress`. It now expands
       the explanation, which is the thing a student most needs on this screen:
       the balance is credited by a HUMAN reviewing the receipt, not automatically.
     • «عرض الكل» beside the ledger was also a `Pressable` with no `onPress`, and
       there is no full-history screen for it to open — `api.wallet.transactions()`
       takes a page argument and this screen only ever reads page 1. Removed rather
       than faked.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Map a wallet transaction type to an icon + tone. */
function txnVisual(type: string, positive: boolean): { icon: IconName; tint: 'danger' | 'success' | 'primary' } {
  if (type.includes('reward') || type.includes('point')) return { icon: 'star', tint: 'success' };
  if (type.includes('refund')) return { icon: 'corner-up-left', tint: 'primary' };
  if (type.includes('trip') || type.includes('ride') || type.includes('payout')) return { icon: 'navigation', tint: positive ? 'success' : 'danger' };
  return { icon: positive ? 'arrow-down-left' : 'arrow-up-right', tint: positive ? 'success' : 'danger' };
}

/** Statuses where the student still owes us a transfer receipt. */
const AWAITING_PROOF = ['pending', 'submitted', 'under_review'];

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
  /* The wallet LEDGER. «لا معاملات» on a failed fetch is the worst version of this
     bug: it tells someone their money moved nowhere. */
  const [status, setStatus] = useState<ListStatus>({ kind: 'loading' });
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [howTo, setHowTo] = useState(false);
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
      setStatus({ kind: 'ready' });
    } catch (e) {
      setStatus(statusFromError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apiMessage = (e: unknown) =>
    e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error');

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
      toast.error(apiMessage(e));
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
      toast.error(apiMessage(e));
    } finally {
      setUploadingId(null);
    }
  };

  const payTone = (st: string) => (st === 'approved' ? 'success' : st === 'rejected' ? 'danger' : 'primary');
  const pendingProof = payments.filter((p) => AWAITING_PROOF.includes(p.status) && p.id !== active?.request.id);
  const initial = (user?.full_name ?? 'ر').charAt(0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.push('/(app)/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          hitSlop={8}
          style={s.avatar}
        >
          <Text role="titleMd" tone="inverse">{initial}</Text>
        </Pressable>
        <Text role="titleLg" tone="primary">{t('common.appName')}</Text>
        <Pressable
          onPress={() => router.push('/(app)/notifications')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.notifications')}
          hitSlop={8}
          style={s.headerBtn}
        >
          <Icon name="bell" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.balanceCard}>
          <View style={s.balanceBlob} pointerEvents="none" />
          <Text role="titleSm" tone="secondary" align="center">{t('wallet.balance')}</Text>
          {loading ? (
            <Skeleton width={170} height={44} radius={10} style={s.balanceSkeleton} />
          ) : (
            <Text role="displayMd" tone="primary" align="center">
              {/* `DINAR` («د.أ»), not a hardcoded Latin "JOD" — every other screen
                  in both apps uses the constant, and this one was the outlier. */}
              <Text role="titleLg" tone="primary">{DINAR} </Text>
              {bareJod(wallet?.available_fils ?? 0)}
            </Text>
          )}
          {/*
            A hold is why the number above can be lower than the sum of top-ups.
            Left unexplained it reads as money going missing.
          */}
          {!loading && wallet && wallet.held_fils > 0 ? (
            <Text role="caption" tone="muted" align="center">
              {t('wallet.heldNote')}: {formatJod(wallet.held_fils)}
            </Text>
          ) : null}
        </View>

        {active ? (
          <TopupGuide
            data={active}
            uploading={uploadingId === active.request.id}
            onUpload={() => void uploadProof(active.request.id)}
            onDismiss={() => setActive(null)}
            s={s}
            t={t}
            theme={theme}
          />
        ) : (
          <View style={s.cliqCard}>
            <View style={s.cliqHead}>
              <View style={s.cliqIcon}>
                <Icon name="grid-3x3" size={22} color={theme.colors.accent} />
              </View>
              <View style={s.flex}>
                <Text role="titleMd" tone="primary">{t('wallet.cliqTitle')}</Text>
                <Pressable
                  onPress={() => setHowTo((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={t('wallet.cliqHowTo')}
                  accessibilityState={{ expanded: howTo }}
                  hitSlop={6}
                  style={s.cliqLinkRow}
                >
                  <Text role="label" tone="success">{t('wallet.cliqHowTo')}</Text>
                  <Icon name={howTo ? 'chevron-up' : 'circle-question-mark'} size={14} color={theme.colors.accent} />
                </Pressable>
              </View>
            </View>

            {howTo ? (
              <Text role="body" tone="secondary" style={s.howToBody}>{t('wallet.cliqHowToBody')}</Text>
            ) : null}

            <View style={s.amountRow}>
              <Text role="titleSm" tone="secondary">{DINAR}</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder={t('wallet.enterAmount')}
                placeholderTextColor={theme.colors.muted}
                accessibilityLabel={t('wallet.amount')}
                style={s.amountInput}
                textAlign="right"
              />
            </View>
            <Button title={t('wallet.createLink')} icon="link" variant="outline" onPress={createTopup} loading={creating} />
          </View>
        )}

        {/* Requests that still need a receipt — the only ones the student must act on. */}
        {pendingProof.map((p) => (
          <Card key={p.id} style={s.spaced}>
            <View style={s.rowBetween}>
              <Text role="titleSm">{p.purpose_label}</Text>
              <Badge label={p.status === 'pending' ? t('wallet.awaitingProof') : t('wallet.underReview')} tone={payTone(p.status)} />
            </View>
            <Text role="caption" tone="muted">{formatJod(p.amount_fils)} · {p.number}</Text>
            {p.reject_reason ? <Text role="caption" tone="danger">{p.reject_reason}</Text> : null}
            <Pressable
              onPress={() => void uploadProof(p.id)}
              accessibilityRole="button"
              accessibilityLabel={t('wallet.uploadProof')}
              accessibilityState={{ busy: uploadingId === p.id }}
              style={s.outlineBtn}
            >
              <Icon name="upload" size={16} color={theme.colors.primary} />
              <Text role="label" tone="primary">{uploadingId === p.id ? t('common.loading') : t('wallet.uploadProof')}</Text>
            </Pressable>
          </Card>
        ))}

        {/* ── Ledger ── */}
        <Text role="titleLg" tone="primary" style={s.sectionTitle}>{t('wallet.transactions')}</Text>
        {loading ? (
          <View style={s.gap}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={68} radius={theme.radius.card} />
            ))}
          </View>
        ) : status.kind !== 'ready' ? (
          <ListState status={status} onRetry={load} labels={listLabels(t)} />
        ) : txns.length === 0 ? (
          <EmptyState icon="credit-card" title={t('wallet.noTransactions')} />
        ) : (
          txns.map((tx) => {
            const positive = tx.amount_fils >= 0;
            const v = txnVisual(tx.type ?? '', positive);
            return (
              <View key={tx.id} style={s.txn}>
                <View style={[s.txnIcon, { backgroundColor: theme.colors[`${v.tint}Soft`] }]}>
                  <Icon name={v.icon} size={18} color={theme.colors[v.tint]} />
                </View>
                <View style={s.flex}>
                  <Text role="titleSm">{tx.type_label}</Text>
                  {tx.created_at ? (
                    <Text role="caption" tone="muted">{new Date(tx.created_at).toLocaleString(locale)}</Text>
                  ) : null}
                </View>
                <Text role="titleSm" tone={positive ? 'success' : 'danger'}>{formatJodSigned(tx.amount_fils)}</Text>
              </View>
            );
          })
        )}

        {/* ── Top-up history, absorbed from `payments.tsx` ── */}
        <Text role="titleLg" tone="primary" style={s.sectionTitle}>{t('wallet.history')}</Text>
        {loading ? (
          <Skeleton width="100%" height={68} radius={theme.radius.card} />
        ) : payments.length === 0 ? (
          <EmptyState icon="dollar-sign" title={t('payments.none')} />
        ) : (
          payments.map((p) => (
            <Card key={p.id}>
              <View style={s.rowBetween}>
                <Text role="titleSm">{p.number}</Text>
                <Badge label={p.status_label} tone={payTone(p.status)} />
              </View>
              <Text role="caption" tone="muted">{p.purpose_label} · {formatJod(p.amount_fils)}</Text>
              {p.created_at ? (
                <Text role="caption" tone="muted">{new Date(p.created_at).toLocaleString(locale)}</Text>
              ) : null}
              {p.reject_reason ? <Text role="caption" tone="danger">{p.reject_reason}</Text> : null}
              <Pressable
                onPress={() => void saveInvoicePdf(p, user?.full_name ?? '').catch(() => toast.error(t('common.error')))}
                accessibilityRole="button"
                accessibilityLabel={t('payments.saveInvoice')}
                style={s.ghostRow}
              >
                <Icon name="download" size={16} color={theme.colors.muted} />
                <Text role="label" tone="muted">{t('payments.saveInvoice')}</Text>
              </Pressable>
            </Card>
          ))
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
      <View style={s.rowBetween}>
        <Text role="titleMd" tone="primary">{t('wallet.newTopup')}</Text>
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('a11y.close')} hitSlop={8}>
          <Icon name="x" size={18} color={theme.colors.muted} />
        </Pressable>
      </View>
      <StepRow n={1} done label={formatJod(data.request.amount_fils)} s={s} theme={theme} />
      <StepRow n={2} label={t('wallet.transferStep')} s={s} theme={theme} />
      <View style={s.cliqBox}>
        <Row label={t('wallet.alias')} value={ins.alias ?? '—'} s={s} />
        <Row label={t('wallet.beneficiary')} value={ins.beneficiary ?? '—'} s={s} />
        <Row label={t('wallet.amount')} value={formatJod(ins.amount_fils)} s={s} />
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
      <View style={[s.stepDot, done && s.stepDotDone]}>
        {done ? <Icon name="check" size={13} color={theme.colors.textInverse} /> : <Text role="label" tone="success">{n}</Text>}
      </View>
      <Text role="titleSm" style={s.flex}>{label}</Text>
    </View>
  );
}

function Row({ label, value, s }: { label: string; value: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.rowBetween}>
      <Text role="body" tone="secondary">{label}</Text>
      <Text role="titleSm" selectable>{value}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    flex: { flex: 1 },
    gap: { gap: t.spacing.sm },
    spaced: { marginTop: t.spacing.md },
    header: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 40, height: 40, borderRadius: t.radius.pill, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    balanceCard: {
      backgroundColor: t.colors.surface, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.surfaceHighest,
      padding: t.spacing.lg, alignItems: 'center', overflow: 'hidden', gap: 4, ...t.shadow.md,
    },
    balanceBlob: { position: 'absolute', top: -64, end: -64, width: 128, height: 128, borderRadius: 64, backgroundColor: t.colors.onPrimaryMuted, opacity: 0.2 },
    balanceSkeleton: { alignSelf: 'center', marginVertical: 6 },

    cliqCard: { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.sheet, padding: t.spacing.lg, marginTop: t.spacing.md, gap: t.spacing.sm },
    cliqHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm },
    cliqLinkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
    cliqIcon: { width: 40, height: 40, borderRadius: t.radius.pill, backgroundColor: t.colors.accentBright, alignItems: 'center', justifyContent: 'center' },
    howToBody: { backgroundColor: t.colors.surface, borderRadius: t.radius.control, padding: t.spacing.md },
    amountRow: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: t.colors.surface,
      borderRadius: t.radius.control, borderWidth: 1, borderColor: t.colors.hairline,
      paddingHorizontal: t.spacing.base, height: 54,
    },
    amountInput: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },

    stepRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, marginTop: t.spacing.sm },
    stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.accent, alignItems: 'center', justifyContent: 'center' },
    stepDotDone: { backgroundColor: t.colors.success, borderColor: t.colors.success },
    cliqBox: { backgroundColor: t.colors.surface, borderRadius: t.radius.control, padding: t.spacing.md, marginVertical: t.spacing.sm, marginEnd: 32, gap: 6 },

    rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: t.spacing.sm },
    sectionTitle: { marginTop: t.spacing.lg, marginBottom: t.spacing.md },
    txn: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface,
      borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.hairline,
      padding: t.spacing.md, marginBottom: t.spacing.sm,
    },
    txnIcon: { width: 44, height: 44, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center' },
    outlineBtn: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: t.spacing.sm,
      borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.control, paddingVertical: 10,
    },
    ghostRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: t.spacing.xs, paddingVertical: 8 },
  });
