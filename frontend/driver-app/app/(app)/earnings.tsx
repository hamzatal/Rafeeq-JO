import { useCallback, useMemo, useState } from 'react';
import { DINAR, bareJod, formatJod, formatJodSigned } from '@rafeeq/shared';
import type { CliqInstructions, EarningsSummary, PaymentRequest, PayoutRequest, Wallet, WalletTransaction } from '@rafeeq/shared';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  Num,
  pickProof,
  SectionTitle,
  Sheet,
  SkeletonList,
  Text,
  useTheme,
  type AppTheme,
  type IconName,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { saveInvoicePdf } from '../../src/lib/invoice';

/* ═══════════════════════════════════════════════════════════════════════════
   أرباحي — one money screen, per design screen 30.

   ── The four it replaced, and what each one got wrong alone ────────────────

     earnings.tsx         204   balance + transactions + two links out
     earnings-detail.tsx  210   the daily/weekly chart, on its own route
     withdraw.tsx          55   a form with NO ACCESS TO THE BALANCE, so it could
                                not tell a captain their amount was too high; it
                                asked the server and relayed the rejection
     invoices.tsx         166   top-up + payment requests, and an ORPHAN: nothing
                                in either app linked to it. Reachable only by
                                tapping a push notification.

   573 lines across four routes for one question — «how much have I made and how do
   I get it?» — and the answer was split so that no single screen could be right.

   ── Three numbers that all called themselves "today" ───────────────────────

   `earnings.tsx` showed `wallet.available_fils`, `earnings-detail.tsx` showed
   `totals.today_fils`, and `dashboard.tsx` showed `perf.available_earnings_fils`
   under the label «أرباح اليوم». Three different quantities, two of them mislabelled,
   on three screens a captain moves between. Here they are named separately and once:
   the hero is what can be WITHDRAWN, and today's earnings sit beside it as earnings.

   ── Why the sheets ────────────────────────────────────────────────────────

   Withdrawing and topping up are FORMS, not destinations: a captain arrives wanting
   a number, and only sometimes wants to act on it. As sheets they keep their own
   dismiss affordance (which `withdraw.tsx` got from `router.back()`) without costing
   a route — and the withdraw form can finally see the balance it is spending.
   ═══════════════════════════════════════════════════════════════════════════ */

type Tab = 'daily' | 'weekly';

function txnVisual(type: string, positive: boolean): { icon: IconName; navy: boolean } {
  if (type.includes('payout') || type.includes('withdraw')) return { icon: 'house', navy: true };
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
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [tab, setTab] = useState<Tab>('daily');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [instructions, setInstructions] = useState<CliqInstructions | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  /*
   * One load for the whole screen, but the two OPTIONAL sources cannot take it down.
   *
   * `earnings-summary` and `payments.mine` are secondary — a captain opening this
   * screen wants the balance. Merging four screens naively would have made a failure
   * in the payments list blank the balance card, which is strictly worse than four
   * screens were.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [w, tx, wd, sum, pay] = await Promise.all([
        api.wallet.show(),
        api.wallet.transactions(),
        api.payouts.withdrawals().catch(() => [] as PayoutRequest[]),
        api.payouts.earningsSummary().catch(() => null),
        api.payments.mine().catch(() => [] as PaymentRequest[]),
      ]);
      setWallet(w);
      setTxns(tx);
      setPayouts(wd);
      setSummary(sum);
      setPayments(pay);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * `useFocusEffect` ALONE. It already fires on mount, and this is a tab that never
   * unmounts — a plain `useEffect` beside it fired both on mount, so the screen made
   * every request twice with no staleness guard, and the later-RESOLVING response won
   * regardless of which was sent first.
   */
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const alias = payouts.find((p) => p.destination)?.destination ?? user?.phone ?? '—';
  const available = wallet?.available_fils ?? 0;
  const debt = wallet?.debt_fils ?? 0;

  const buckets = useMemo(() => {
    if (!summary) return [] as { label: string; earnings_fils: number; trips: number }[];
    const rows = tab === 'daily' ? summary.daily : summary.weekly;

    return rows.map((r) => ({
      label: new Date(('date' in r ? r.date : r.week_start) + 'T00:00:00').toLocaleDateString(
        locale,
        tab === 'daily' ? { weekday: 'short' } : { day: 'numeric', month: 'short' },
      ),
      earnings_fils: r.earnings_fils,
      trips: r.trips,
    }));
  }, [summary, tab, locale]);

  const maxFils = Math.max(1, ...buckets.map((b) => b.earnings_fils));

  const submitWithdrawal = async () => {
    setMsg(null);
    const jod = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(jod) || jod <= 0) return setMsg({ text: t('validation.required'), ok: false });
    const amountFils = Math.round(jod * 1000);
    /*
     * The check `withdraw.tsx` could not make.
     *
     * It lived on its own route with no wallet in scope, so it posted any number and
     * relayed whatever the server said. Asking for more than the balance is the single
     * most likely mistake on this form, and it was the one thing it could not catch.
     */
    if (amountFils > available) {
      return setMsg({ text: `${t('driver.availableToWithdraw')}: ${formatJod(available)}`, ok: false });
    }
    setBusy(true);
    try {
      await api.payouts.requestWithdrawal({ amount_fils: amountFils, destination: destination.trim() || undefined });
      setShowWithdraw(false);
      setAmount('');
      setMsg({ text: t('payout.submitted'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const createTopup = async () => {
    setMsg(null);
    const jod = Number(topupAmount);
    if (!Number.isFinite(jod) || jod < 1) return setMsg({ text: t('wallet.invalidAmount'), ok: false });
    setBusy(true);
    try {
      const { instructions: ins } = await api.payments.create({ purpose: 'wallet_topup', amount_fils: Math.round(jod * 1000) });
      setInstructions(ins);
      setMsg({ text: t('payments.created'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('payments.failed'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const uploadProof = async (id: string) => {
    const file = await pickProof();
    if (!file) return;
    setUploading(id);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('proof', file);
      await api.payments.submitProof(id, fd);
      setMsg({ text: t('payments.proofUploaded'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'), ok: false });
    } finally {
      setUploading(null);
    }
  };

  const pendingPayments = payments.filter((p) => ['pending', 'submitted', 'under_review', 'rejected'].includes(p.status));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text role="display" tone="primary">{t('driver.wallet')}</Text>
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.title')}
            hitSlop={8}
            style={s.headerBtn}
          >
            <Icon name="bell" size={24} color={theme.colors.primary} />
          </Pressable>
        </View>

        {msg ? <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} /> : null}

        {loadError ? (
          <ErrorState title={t('common.error')} message={t('common.loadFailed')} retryLabel={t('common.retry')} onRetry={() => void load()} />
        ) : loading && !wallet ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            {/* The hero: what can actually leave the account. */}
            <View style={s.balanceCard}>
              <View style={s.glow} />
              <Text role="body" align="center" style={s.balanceLabel}>{t('driver.availableToWithdraw')}</Text>
              <Text role="displayLg" align="center" style={s.balanceValue}>
                {bareJod(available)} <Text role="titleMd" style={s.balanceCur}>{DINAR}</Text>
              </Text>
              {/* Named separately, because it is a different quantity from the hero. */}
              {summary ? (
                <Text role="label" align="center" style={s.balanceSub}>
                  {t('driver.todayNet')}: {formatJod(summary.totals.today_fils)} · {summary.totals.today_trips} {t('driver.tripsShort')}
                </Text>
              ) : null}
              {wallet && wallet.held_fils > 0 ? (
                <Text role="label" align="center" style={s.balanceSub}>
                  {t('driver.heldNote')}: {formatJod(wallet.held_fils)}
                </Text>
              ) : null}
              <Pressable
                onPress={() => setShowWithdraw(true)}
                accessibilityRole="button"
                style={({ pressed }) => [s.withdrawBtn, pressed && s.pressed]}
              >
                <Icon name="house" size={18} color={theme.colors.onAccent} />
                <Text role="titleMd" align="center" style={s.withdrawText}>{t('driver.withdrawBalance')}</Text>
              </Pressable>
              <Text role="caption" align="center" style={s.balanceSub}>{t('driver.withdrawWithin')}</Text>
            </View>

            {/*
              Commission owed on cash trips. A captain working cash holds the whole
              fare and owes us the commission, so this is the one reason they would
              ever ADD money — and `invoices.tsx`, which was where they did it, had no
              inbound link from anywhere.
            */}
            {debt > 0 ? (
              <Pressable
                onPress={() => setShowTopup(true)}
                accessibilityRole="button"
                style={({ pressed }) => [s.debtCard, pressed && s.pressed]}
              >
                <View style={s.debtIcon}>
                  <Icon name="triangle-alert" size={20} color={theme.colors.warning} />
                </View>
                <View style={s.flex}>
                  <Text role="titleSm">{t('driver.commissionDue')}</Text>
                  <Text role="body" tone="secondary">{formatJod(debt)}</Text>
                </View>
                <Text role="label" tone="primary">{t('driver.settleCommission')}</Text>
              </Pressable>
            ) : null}

            {/* CliQ alias — where the money goes. */}
            <Pressable
              onPress={() => setShowWithdraw(true)}
              accessibilityRole="button"
              accessibilityLabel={t('driver.cliqPaymentInfo')}
              style={s.cliqCard}
            >
              <View style={s.cliqIcon}>
                <Icon name="credit-card" size={20} color={theme.colors.primary} />
              </View>
              <View style={s.flex}>
                <Text role="titleSm">{t('driver.cliqPaymentInfo')}</Text>
                <Text role="label" tone="secondary">{t('driver.cliqAliasLabel')}: {alias}</Text>
              </View>
              <Icon name="pencil" size={18} color={theme.colors.primary} />
            </Pressable>

            {/* The chart that used to be its own route. */}
            {summary && summary.totals.all_time_fils > 0 ? (
              <>
                <View style={s.tabs}>
                  {(['daily', 'weekly'] as Tab[]).map((tb) => (
                    <Pressable
                      key={tb}
                      onPress={() => setTab(tb)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tab === tb }}
                      style={[s.tab, tab === tb && s.tabActive]}
                    >
                      <Text role="label" tone={tab === tb ? 'primary' : 'secondary'} align="center" style={tab === tb && s.tabTextActive}>
                        {t(tb === 'daily' ? 'driver.tabDaily' : 'driver.tabWeekly')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={s.chartCard}>
                  <View style={s.chartHead}>
                    <Text role="titleSm" tone="secondary">{t('driver.thisPeriod')}</Text>
                    <Text role="titleMd" tone="primary">
                      {formatJod(buckets.reduce((sum, b) => sum + b.earnings_fils, 0))}
                    </Text>
                  </View>
                  <View style={s.chart}>
                    {buckets.map((b) => (
                      <View key={b.label} style={s.barCol}>
                        <View style={[s.bar, { height: Math.max(4, Math.round((b.earnings_fils / maxFils) * 110)) }, b.earnings_fils === 0 && s.barEmpty]} />
                        <Text role="caption" tone="muted" align="center" numberOfLines={1}>{b.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {buckets
                  .slice()
                  .reverse()
                  .map((b) => (
                    <View key={b.label} style={s.row}>
                      <View style={s.rowIcon}>
                        <Icon name="navigation" size={16} color={theme.colors.accent} />
                      </View>
                      <View style={s.flex}>
                        <Text role="titleSm">{tab === 'weekly' ? `${t('driver.weekOf')} ${b.label}` : b.label}</Text>
                        <Num style={s.rowMeta} value={b.trips} unit={t('driver.tripsShort')} />
                      </View>
                      <Text role="titleSm" tone="primary">{formatJod(b.earnings_fils)}</Text>
                    </View>
                  ))}
              </>
            ) : null}

            {/* Money that has already moved. */}
            <SectionTitle title={t('driver.recentTransactions')} />
            {txns.length === 0 ? (
              <EmptyState icon="credit-card" title={t('wallet.noTransactions')} />
            ) : (
              txns.map((tx) => {
                const positive = tx.amount_fils >= 0;
                const v = txnVisual(tx.type ?? '', positive);
                const tint = v.navy ? theme.colors.primary : theme.colors.accent;

                return (
                  <View key={tx.id} style={s.txn}>
                    <View style={[s.txnIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                      <Icon name={v.icon} size={18} color={tint} />
                    </View>
                    <View style={s.flex}>
                      <Text role="titleSm">{tx.type_label}</Text>
                      {tx.created_at ? (
                        <Text role="caption" tone="muted">{new Date(tx.created_at).toLocaleString(locale)}</Text>
                      ) : null}
                    </View>
                    <Text role="titleSm" tone={positive ? 'success' : 'default'}>{formatJodSigned(tx.amount_fils)}</Text>
                  </View>
                );
              })
            )}

            {/* Top-ups awaiting a receipt — the orphan screen's only real content. */}
            {pendingPayments.length > 0 ? (
              <>
                <SectionTitle title={t('payments.title')} />
                {pendingPayments.map((p) => (
                  <Card key={p.id} style={s.cardGap}>
                    <View style={s.rowBetween}>
                      <Text role="titleSm">{p.number}</Text>
                      <Badge label={p.status_label} tone={p.status === 'rejected' ? 'danger' : 'primary'} />
                    </View>
                    <Text role="label" tone="secondary">{p.purpose_label} · {formatJod(p.amount_fils)}</Text>
                    {p.reject_reason ? <Text role="label" tone="danger">{p.reject_reason}</Text> : null}
                    <View style={s.paymentActions}>
                      <Pressable
                        onPress={() => void uploadProof(p.id)}
                        accessibilityRole="button"
                        accessibilityState={{ busy: uploading === p.id }}
                        style={s.proofBtn}
                      >
                        <Icon name="upload" size={16} color={theme.colors.primary} />
                        <Text role="label" tone="primary">
                          {uploading === p.id ? t('common.loading') : t('payments.uploadProof')}
                        </Text>
                      </Pressable>
                      {/* A silent `.catch(() => {})` here meant a failed PDF looked like
                          a successful one: the sheet never opened and nothing said why. */}
                      <Pressable
                        onPress={() =>
                          void saveInvoicePdf(p, user?.full_name ?? '').catch(() =>
                            setMsg({ text: t('common.error'), ok: false }),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={t('payments.saveInvoice')}
                        style={s.proofBtn}
                      >
                        <Icon name="download" size={16} color={theme.colors.muted} />
                        <Text role="label" tone="muted">{t('payments.saveInvoice')}</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Withdraw — a form that can finally see the balance it is spending. */}
      <Sheet visible={showWithdraw} onClose={() => setShowWithdraw(false)} title={t('payout.withdraw')}>
        <Text role="body" tone="secondary">
          {t('driver.availableToWithdraw')}: {formatJod(available)}
        </Text>
        <Input label={t('payout.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="5.000" />
        <Input label={t('payout.destination')} value={destination} onChangeText={setDestination} placeholder="07XXXXXXXX" keyboardType="phone-pad" />
        <Text role="caption" tone="muted">{t('payout.minHint')}</Text>
        <Button title={t('payout.submit')} onPress={submitWithdrawal} loading={busy} />
      </Sheet>

      {/* Top up — to settle cash commission, the one reason a captain adds money. */}
      <Sheet visible={showTopup} onClose={() => setShowTopup(false)} title={t('driver.settleCommission')}>
        <Text role="body" tone="secondary">{t('driver.commissionDue')}: {formatJod(debt)}</Text>
        <Input label={t('wallet.amount')} keyboardType="numeric" value={topupAmount} onChangeText={setTopupAmount} placeholder="5" />
        <Button title={t('payments.topupWallet')} onPress={createTopup} loading={busy} />
        {instructions ? (
          <View style={s.cliqBox}>
            <View style={s.rowStart}>
              <Icon name="info" size={18} color={theme.colors.primary} />
              <Text role="titleSm">{t('wallet.cliqTitle')}</Text>
            </View>
            <Text role="body">{t('wallet.alias')}: {instructions.alias ?? '—'}</Text>
            <Text role="body">{t('wallet.reference')}: {instructions.reference}</Text>
            <Text role="label" tone="muted">{instructions.note}</Text>
          </View>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },
    headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1 },
    cardGap: { marginBottom: t.spacing.sm },
    pressed: { opacity: 0.9 },

    balanceCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.sheet, padding: t.spacing.lg, overflow: 'hidden', gap: 4, ...t.shadow.md },
    glow: { position: 'absolute', top: -40, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: t.colors.accent, opacity: 0.12 },
    balanceLabel: { color: 'rgba(255,255,255,0.7)' },
    balanceValue: { color: '#FFFFFF' },
    balanceCur: { color: 'rgba(255,255,255,0.85)' },
    balanceSub: { color: 'rgba(255,255,255,0.62)' },
    withdrawBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.accent, borderRadius: t.radius.control, height: 54, marginTop: t.spacing.base },
    withdrawText: { color: t.colors.onAccent },

    debtCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.warningSoft, borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.warning, padding: t.spacing.base, marginTop: t.spacing.md },
    debtIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center' },

    cliqCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, marginTop: t.spacing.md, ...t.shadow.sm },
    cliqIcon: { width: 44, height: 44, borderRadius: t.radius.control, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    cliqBox: { gap: 4, marginTop: t.spacing.md, padding: t.spacing.md, borderRadius: t.radius.control, borderWidth: 1, borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },

    tabs: { flexDirection: 'row-reverse', backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.control, padding: 4, marginTop: t.spacing.lg, gap: 4 },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: t.radius.control },
    tabActive: { backgroundColor: t.colors.surface, ...t.shadow.sm },
    tabTextActive: { fontFamily: t.fontFamily.bold },

    chartCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.md, marginTop: t.spacing.md },
    chartHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    chart: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, gap: 4 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    bar: { width: '58%', backgroundColor: t.colors.accent, borderRadius: 6 },
    barEmpty: { backgroundColor: t.colors.hairline },

    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.md, marginTop: t.spacing.sm },
    rowBetween: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    rowStart: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    rowMeta: { color: t.colors.muted, textAlign: 'right' },

    txn: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.md, marginBottom: t.spacing.sm },
    txnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

    paymentActions: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginTop: t.spacing.sm },
    proofBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: t.radius.control, borderWidth: 1, borderColor: t.colors.border },
  });
