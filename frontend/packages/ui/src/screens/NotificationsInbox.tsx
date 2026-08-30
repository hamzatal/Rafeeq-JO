/* ═══════════════════════════════════════════════════════════════════════════
   THE NOTIFICATION INBOX — and the five bells that led nowhere.

   ── What the captain app had ───────────────────────────────────────────────

   Five bell icons: on the dashboard, the trips list, the wallet, the profile and
   the settings screen. All five were `<Pressable>` with no `onPress`, so a screen
   reader announced "button" and activating it did nothing. Phase 7 demoted them to
   plain `<View>`s — honest, but the honest version of a missing feature is still a
   missing feature, and it left a bell-shaped decoration in five headers.

   The reason they went nowhere is that the captain app had no inbox to open. The
   student app had one, 270 lines of it, and the captain got the same push
   notifications with no way to look back at them: a captain who missed the tap on
   «تم رفض دفعتك» had no route to that information at all.

   ── Why this is shared rather than copied ──────────────────────────────────

   Copying it would have been the fourth time a screen was duplicated into both apps
   in this repo, and the first three all drifted. Everything here — day grouping, the
   unread count from `meta.unread_count`, the paginator, the preference toggles — is
   audience-independent. The one thing that is not is the coupon block: a promo code
   in a notification is something a student can activate against a ride, and a
   captain has nothing to spend one on. So it is an optional callback, and the
   captain app simply does not pass it.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppNotification, NotificationPreference } from '@rafeeq/shared';
import { RafeeqApiError, type RafeeqApi } from '@rafeeq/api-client';
import { Icon, type IconName } from '../components/Icon';
import { Text } from '../components/Text';
import { Card } from '../components/surfaces';
import { EmptyState, ErrorState } from '../components/states';
import { ListSkeleton } from '../components/kit';
import { useI18n } from '../runtime/i18n';
import { useTheme, type AppTheme } from '../theme';

const CATEGORY_ICON: Record<string, IconName> = {
  payments: 'dollar-sign',
  trips: 'navigation',
  ratings: 'star',
  safety: 'shield',
  general: 'bell',
};

export interface NotificationsInboxProps {
  api: RafeeqApi;
  /**
   * Activate a promo code carried in a notification.
   *
   * Student-only: a captain has nothing to spend a ride coupon on, so the captain
   * app omits it and the coupon block is not rendered at all. Optional rather than
   * a no-op default, because a button that does nothing is the bug this screen was
   * created to fix.
   */
  onActivateCoupon?: (code: string) => Promise<void>;
}

export function NotificationsInbox({ api, onActivateCoupon }: NotificationsInboxProps) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<AppNotification[]>([]);
  /*
   * The inbox-wide unread count, from `meta.unread_count`.
   *
   * It was inferred from the twenty rows page one happened to hold, so someone with
   * thirty unread notifications behind them saw no «تحديد الكل كمقروء» button at all.
   */
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [couponMsg, setCouponMsg] = useState<Record<string, { text: string; ok: boolean }>>({});

  const activate = async (id: string, code: string) => {
    if (!onActivateCoupon) return;
    try {
      await onActivateCoupon(code);
      setCouponMsg((m) => ({ ...m, [id]: { text: t('payments.couponActivated'), ok: true } }));
    } catch (e) {
      /*
       * `firstError()` before `message`. The student copy did this and the extraction
       * dropped it: `RafeeqApiError.message` is the envelope's generic text, while
       * `firstError()` is the 422 field reason — «هذا الكوبون منتهي» rather than
       * «تعذّر إكمال العملية».
       */
      const text = e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error');
      setCouponMsg((m) => ({ ...m, [id]: { text, ok: false } }));
    }
  };

  const load = async () => {
    setLoadError(false);
    try {
      const [list, p] = await Promise.all([api.notifications.list({ page: 1 }), api.notifications.preferences()]);
      setItems(list.items);
      setUnread(list.unreadCount);
      setHasMore(list.hasMore);
      setPage(1);
      setPrefs(p);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  /*
   * The next page. `api.notifications.list` has always accepted `page` and nothing
   * could pass it, because the client discarded the paginator meta that says whether
   * there IS a next page — so the inbox silently ended at twenty rows.
   */
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await api.notifications.list({ page: page + 1 });
      setItems((prev) => [...prev, ...next.items]);
      setUnread(next.unreadCount);
      setHasMore(next.hasMore);
      setPage((p) => p + 1);
    } catch {
      /* Keep what is already on screen; the retry is another tap on the same button. */
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAll = async () => {
    await api.notifications.markAllRead();
    await load();
  };

  const open = async (n: AppNotification) => {
    if (n.read) return;
    await api.notifications.markRead(n.id);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const toggle = async (key: keyof NotificationPreference, value: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await api.notifications.updatePreferences({ [key]: value });
    } catch {
      setPrefs(prefs);
    }
  };

  // Grouped by day (Today / Yesterday / Earlier).
  const groups = useMemo(() => {
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayStart = startOfDay(new Date());
    const dayMs = 86400000;
    const buckets: { key: string; label: string; items: AppNotification[] }[] = [
      { key: 'today', label: t('notifications.today'), items: [] },
      { key: 'yesterday', label: t('notifications.yesterday'), items: [] },
      { key: 'earlier', label: t('notifications.earlier'), items: [] },
    ];
    for (const n of items) {
      const ts = n.created_at ? new Date(n.created_at).getTime() : 0;
      if (ts >= todayStart) buckets[0]!.items.push(n);
      else if (ts >= todayStart - dayMs) buckets[1]!.items.push(n);
      else buckets[2]!.items.push(n);
    }

    return buckets.filter((b) => b.items.length > 0);
  }, [items, t]);

  const renderNotif = (n: AppNotification) => {
    const couponCode = typeof n.data?.coupon_code === 'string' ? n.data.coupon_code : null;

    return (
      <Pressable key={n.id} onPress={() => void open(n)} accessibilityRole="button" style={[s.item, !n.read && s.unread]}>
        <View style={[s.iconWrap, !n.read && s.iconWrapUnread]}>
          <Icon
            name={CATEGORY_ICON[n.category] ?? 'bell'}
            size={18}
            color={n.is_critical ? theme.colors.danger : theme.colors.primary}
          />
        </View>
        <View style={s.itemBody}>
          <Text role="titleSm" numberOfLines={1} style={s.strong}>{n.title}</Text>
          <Text role="body" tone="secondary" numberOfLines={2} style={s.gap2}>{n.body}</Text>
          {n.created_at ? (
            <Text role="caption" tone="muted" style={s.gap4}>{new Date(n.created_at).toLocaleString(locale)}</Text>
          ) : null}
          {couponCode && onActivateCoupon ? (
            <View style={s.couponBox}>
              <View style={s.couponRow}>
                <Text role="titleSm" tone="primary" style={s.couponCode}>{couponCode}</Text>
                <Pressable onPress={() => void activate(n.id, couponCode)} accessibilityRole="button" style={s.couponBtn}>
                  <Icon name="gift" size={14} color={theme.colors.onPrimary} />
                  <Text role="label" tone="inverse" style={s.strong}>{t('payments.couponActivate')}</Text>
                </Pressable>
              </View>
              {couponMsg[n.id] ? (
                <Text role="label" tone={couponMsg[n.id]!.ok ? 'success' : 'danger'} style={s.gap6}>
                  {couponMsg[n.id]!.text}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        {!n.read && <View style={s.dot} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text role="display">{t('notifications.title')}</Text>
          <View style={s.headerActions}>
            {unread > 0 && (
              <Pressable onPress={() => void markAll()} accessibilityRole="button" accessibilityLabel={t('a11y.markAllRead')} style={s.headerBtn}>
                <Icon name="circle-check" size={18} color={theme.colors.primary} />
              </Pressable>
            )}
            <Pressable
              onPress={() => setShowPrefs((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.notificationPrefs')}
              accessibilityState={{ expanded: showPrefs }}
              style={s.headerBtn}
            >
              <Icon name="sliders-horizontal" size={18} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {showPrefs && prefs && (
          <Card>
            <PrefRow label={t('notifications.push')} value={prefs.push_enabled} onChange={(v) => void toggle('push_enabled', v)} s={s} />
            <PrefRow label={t('notifications.sms')} value={prefs.sms_enabled} onChange={(v) => void toggle('sms_enabled', v)} s={s} />
            <PrefRow label={t('notifications.catPayments')} value={prefs.payments} onChange={(v) => void toggle('payments', v)} s={s} />
            <PrefRow label={t('notifications.catTrips')} value={prefs.trips} onChange={(v) => void toggle('trips', v)} s={s} />
            <PrefRow label={t('notifications.catRatings')} value={prefs.ratings} onChange={(v) => void toggle('ratings', v)} s={s} />
            <PrefRow label={t('notifications.catGeneral')} value={prefs.general} onChange={(v) => void toggle('general', v)} s={s} last />
          </Card>
        )}

        {loading && items.length === 0 ? (
          <ListSkeleton rows={5} />
        ) : loadError && items.length === 0 ? (
          <ErrorState
            title={t('common.error')}
            message={t('common.loadFailed')}
            retryLabel={t('common.retry')}
            onRetry={() => {
              setLoading(true);
              void load();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="bell" title={t('notifications.none')} />
        ) : (
          <>
            {groups.map((g) => (
              <View key={g.key}>
                <Text role="label" tone="secondary" style={s.groupLabel}>{g.label}</Text>
                {g.items.map(renderNotif)}
              </View>
            ))}
            {hasMore ? (
              <Pressable
                onPress={() => void loadMore()}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel={t('common.loadMore')}
                accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
                style={s.loadMore}
              >
                <Text role="titleSm" tone="primary" align="center">
                  {loadingMore ? t('common.loading') : t('common.loadMore')}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PrefRow({
  label,
  value,
  onChange,
  s,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  s: ReturnType<typeof makeStyles>;
  last?: boolean;
}) {
  return (
    <View style={[s.prefRow, !last && s.prefBorder]}>
      <Text role="body" style={s.medium}>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },
    headerActions: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    prefRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    prefBorder: { borderBottomWidth: 1, borderBottomColor: t.colors.border },
    medium: { fontFamily: t.fontFamily.medium },
    strong: { fontFamily: t.fontFamily.bold },
    groupLabel: { fontFamily: t.fontFamily.bold, marginTop: t.spacing.sm, marginBottom: t.spacing.sm },
    item: { flexDirection: 'row-reverse', alignItems: 'flex-start', backgroundColor: t.colors.card, borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    unread: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    iconWrapUnread: { backgroundColor: t.colors.surface },
    itemBody: { flex: 1 },
    gap2: { marginTop: 2 },
    gap4: { marginTop: 4 },
    gap6: { marginTop: 6 },
    couponBox: { marginTop: 8, padding: 8, borderRadius: t.radius.control, backgroundColor: t.colors.background, borderWidth: 1, borderColor: t.colors.border, borderStyle: 'dashed' },
    couponRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    couponCode: { fontFamily: t.fontFamily.bold, letterSpacing: 1 },
    couponBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: t.colors.primary, borderRadius: t.radius.control, paddingHorizontal: 12, paddingVertical: 7 },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.primary, marginEnd: 6, marginTop: 6 },
    loadMore: { alignItems: 'center', paddingVertical: t.spacing.md, marginTop: t.spacing.sm, borderRadius: t.radius.control, borderWidth: 1, borderColor: t.colors.border },
  });
