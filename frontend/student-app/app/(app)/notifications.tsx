import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { AppNotification, NotificationPreference } from '@rafeeq/shared';
import { Screen } from '../../src/components/Screen';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Notifications() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);

  const load = async () => {
    try {
      const [list, p] = await Promise.all([api.notifications.list(), api.notifications.preferences()]);
      setItems(list);
      setPrefs(p);
    } catch {
      /* silent */
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
      setPrefs(prefs); // revert on failure
    }
  };

  return (
    <Screen scroll>
      <View style={s.headerRow}>
        <Text style={s.h1}>{t('notifications.title')}</Text>
        <Pressable onPress={() => setShowPrefs((v) => !v)}>
          <Text style={s.link}>⚙︎ {t('notifications.preferences')}</Text>
        </Pressable>
      </View>

      {showPrefs && prefs && (
        <View style={s.card}>
          <PrefRow label={t('notifications.push')} value={prefs.push_enabled} onChange={(v) => toggle('push_enabled', v)} s={s} />
          <PrefRow label={t('notifications.sms')} value={prefs.sms_enabled} onChange={(v) => toggle('sms_enabled', v)} s={s} />
          <PrefRow label={t('notifications.catPayments')} value={prefs.payments} onChange={(v) => toggle('payments', v)} s={s} />
          <PrefRow label={t('notifications.catTrips')} value={prefs.trips} onChange={(v) => toggle('trips', v)} s={s} />
          <PrefRow label={t('notifications.catRatings')} value={prefs.ratings} onChange={(v) => toggle('ratings', v)} s={s} />
          <PrefRow label={t('notifications.catGeneral')} value={prefs.general} onChange={(v) => toggle('general', v)} s={s} />
        </View>
      )}

      {items.length > 0 && (
        <Pressable onPress={markAll} style={s.markAll}>
          <Text style={s.link}>{t('notifications.markAllRead')}</Text>
        </Pressable>
      )}

      {items.length === 0 ? (
        <Text style={s.meta}>{t('notifications.none')}</Text>
      ) : (
        items.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)} style={[s.item, !n.read && s.unread]}>
            <View style={s.row}>
              <Text style={s.title}>{n.title}</Text>
              {!n.read && <View style={s.dot} />}
            </View>
            <Text style={s.body}>{n.body}</Text>
            {n.created_at && <Text style={s.meta}>{new Date(n.created_at).toLocaleString(locale)}</Text>}
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function PrefRow({
  label,
  value,
  onChange,
  s,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.prefRow}>
      <Text style={s.prefLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.base },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right' },
    link: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.base },
    prefRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    prefLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text },
    markAll: { alignItems: 'flex-start', marginBottom: t.spacing.sm },
    item: { backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    unread: { borderColor: t.colors.primary, backgroundColor: t.colors.surface },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right', flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.primary, marginLeft: 8 },
    body: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'right', marginTop: 4 },
  });
