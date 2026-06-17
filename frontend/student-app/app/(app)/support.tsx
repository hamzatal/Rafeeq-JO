import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SupportTicket, TicketCategory } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const CATEGORIES: TicketCategory[] = ['subscription', 'trip', 'payment', 'technical', 'other'];

export default function Support() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<SupportTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<TicketCategory>('other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      setItems(await api.support.mine());
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (subject.trim().length < 3 || body.trim().length < 3) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.support.open({ category, subject, body });
      setMsg({ text: t('support.created'), ok: true });
      setSubject('');
      setBody('');
      setShowForm(false);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('support.failed'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={s.headerRow}>
        <Text style={s.h1}>{t('support.title')}</Text>
        <Pressable onPress={() => setShowForm((v) => !v)}>
          <Text style={s.link}>＋ {t('support.newTicket')}</Text>
        </Pressable>
      </View>
      {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

      {showForm && (
        <View style={s.card}>
          <View style={s.chips}>
            {CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipActive]}>
                <Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Input label={t('support.subject')} value={subject} onChangeText={setSubject} />
          <Input label={t('support.message')} value={body} onChangeText={setBody} multiline numberOfLines={4} style={s.multiline} />
          <Button title={t('support.send')} onPress={submit} loading={busy} />
        </View>
      )}

      {items.length === 0 ? (
        <Text style={s.meta}>{t('support.none')}</Text>
      ) : (
        items.map((tk) => (
          <View key={tk.id} style={s.card}>
            <View style={s.row}>
              <Text style={s.cardTitle}>{tk.subject}</Text>
              <Text style={s.badge}>{tk.status_label}</Text>
            </View>
            <Text style={s.meta}>{tk.number} · {tk.category_label}</Text>
            {tk.last_reply_at && <Text style={s.meta}>{new Date(tk.last_reply_at).toLocaleString(locale)}</Text>}
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.base },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right' },
    link: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.base },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.sm },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 6, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: `${t.colors.primary}1A` },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    multiline: { height: 110, textAlignVertical: 'top', paddingTop: 10 },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, flex: 1, textAlign: 'right' },
    badge: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.primary, marginRight: 8 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  });
