import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppNotification, NotificationPreference } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useCoupon } from '../../src/store/coupon';
import { useTheme, type AppTheme } from '../../src/theme';
import { Card, EmptyState, SectionTitle, ErrorState } from '../../src/components/ui';
import { ListSkeleton } from '../../src/components/kit';
import { Icon, type IconName } from '../../src/components/Icon';

const CATEGORY_ICON: Record<string, IconName> = {
  payments: 'dollar-sign',
  trips: 'navigation',
  ratings: 'star',
  safety: 'shield',
  general: 'bell',
};

export default function Notifications() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [couponMsg, setCouponMsg] = useState<Record<string, { text: string; ok: boolean }>>({});
  const activateCoupon = useCoupon((c) => c.activate);

  const onActivateCoupon = async (id: string, code: string) => {
    try {
      // Validate against a nominal ride fare to confirm validity/expiry.
      const res = await api.coupons.validate({ code, scope: 'ride', amount_fils: 1500 });
      await activateCoupon(res.code);
      setCouponMsg((m) => ({ ...m, [id]: { text: t('payments.couponActivated'), ok: true } }));
    } catch (e) {
      const text = e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error');
      setCouponMsg((m) => ({ ...m, [id]: { text, ok: false } }));
    }
  };

  const load = async () => {
    setLoadError(false);
    try {
      const [list, p] = await Promise.all([api.notifications.list(), api.notifications.preferences()]);
      setItems(list);
      setPrefs(p);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    await api.notifications.markAllRead();
    await load();
  };

  const open = async (n: AppNotification) => {
    if (!n.read) {
      await api.notifications.markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
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

  // Group notifications by day (Today / Yesterday / Earlier).
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
      if (ts >= todayStart) buckets[0].items.push(n);
      else if (ts >= todayStart - dayMs) buckets[1].items.push(n);
      else buckets[2].items.push(n);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [items, t]);

  const renderNotif = (n: AppNotification) => (
    <Pressable key={n.id} onPress={() => open(n)} style={[s.item, !n.read && s.unread]}>
      <View style={[s.iconWrap, !n.read && s.iconWrapUnread]}>
        <Icon name={CATEGORY_ICON[n.category] ?? 'bell'} size={18} color={n.is_critical ? theme.colors.danger : theme.colors.primary} />
      </View>
      <View style={s.itemBody}>
        <Text style={s.title} numberOfLines={1}>{n.title}</Text>
        <Text style={s.body} numberOfLines={2}>{n.body}</Text>
        {n.created_at && <Text style={s.meta}>{new Date(n.created_at).toLocaleString(locale)}</Text>}
        {typeof n.data?.coupon_code === 'string' && (
          <View style={s.couponBox}>
            <View style={s.couponRow}>
              <Text style={s.couponCode}>{String(n.data.coupon_code)}</Text>
              <Pressable onPress={() => onActivateCoupon(n.id, String(n.data!.coupon_code))} style={s.couponBtn}>
                <Icon name="gift" size={14} color={theme.colors.onPrimary} />
                <Text style={s.couponBtnText}>{t('payments.couponActivate')}</Text>
              </Pressable>
            </View>
            {couponMsg[n.id] && (
              <Text style={[s.couponMsg, { color: couponMsg[n.id].ok ? theme.colors.success : theme.colors.danger }]}>
                {couponMsg[n.id].text}
              </Text>
            )}
          </View>
        )}
      </View>
      {!n.read && <View style={s.dot} />}
    </Pressable>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.h1}>{t('notifications.title')}</Text>
          <View style={s.headerActions}>
            {items.some((n) => !n.read) && (
              <Pressable onPress={markAll} style={s.headerBtn}>
                <Icon name="check-circle" size={18} color={theme.colors.primary} />
              </Pressable>
            )}
            <Pressable onPress={() => setShowPrefs((v) => !v)} style={s.headerBtn}>
              <Icon name="sliders" size={18} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {showPrefs && prefs && (
          <Card>
            <PrefRow label={t('notifications.push')} value={prefs.push_enabled} onChange={(v) => toggle('push_enabled', v)} s={s} />
            <PrefRow label={t('notifications.sms')} value={prefs.sms_enabled} onChange={(v) => toggle('sms_enabled', v)} s={s} />
            <PrefRow label={t('notifications.catPayments')} value={prefs.payments} onChange={(v) => toggle('payments', v)} s={s} />
            <PrefRow label={t('notifications.catTrips')} value={prefs.trips} onChange={(v) => toggle('trips', v)} s={s} />
            <PrefRow label={t('notifications.catRatings')} value={prefs.ratings} onChange={(v) => toggle('ratings', v)} s={s} />
            <PrefRow label={t('notifications.catGeneral')} value={prefs.general} onChange={(v) => toggle('general', v)} s={s} last />
          </Card>
        )}

        {loading && items.length === 0 ? (
          <ListSkeleton rows={5} />
        ) : loadError && items.length === 0 ? (
          <ErrorState title={t('common.error')} message={t('common.loadFailed')} retryLabel={t('common.retry')} onRetry={() => { setLoading(true); void load(); }} />
        ) : items.length === 0 ? (
          <EmptyState icon="bell" title={t('notifications.none')} />
        ) : (
          groups.map((g) => (
            <View key={g.key}>
              <Text style={s.groupLabel}>{g.label}</Text>
              {g.items.map(renderNotif)}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PrefRow({ label, value, onChange, s, last }: { label: string; value: boolean; onChange: (v: boolean) => void; s: ReturnType<typeof makeStyles>; last?: boolean }) {
  return (
    <View style={[s.prefRow, !last && s.prefBorder]}>
      <Text style={s.prefLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    headerActions: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    prefRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    prefBorder: { borderBottomWidth: 1, borderBottomColor: t.colors.border },
    prefLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text },
    groupLabel: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.sm, marginBottom: t.spacing.sm },
    item: { flexDirection: 'row-reverse', alignItems: 'flex-start', backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    unread: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    iconWrapUnread: { backgroundColor: t.colors.surface },
    itemBody: { flex: 1 },
    title: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    body: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 4 },
    couponBox: { marginTop: 8, padding: 8, borderRadius: t.radius.md, backgroundColor: t.colors.background, borderWidth: 1, borderColor: t.colors.border, borderStyle: 'dashed' },
    couponRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    couponCode: { fontFamily: t.fontFamily.extrabold, fontSize: 15, color: t.colors.primary, letterSpacing: 1 },
    couponBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 7 },
    couponBtnText: { fontFamily: t.fontFamily.bold, fontSize: 12, color: '#FFFFFF' },
    couponMsg: { fontFamily: t.fontFamily.medium, fontSize: 12, textAlign: 'right', marginTop: 6 },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.primary, marginRight: 6, marginTop: 6 },
  });
