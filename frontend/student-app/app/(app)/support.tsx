import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SupportTicket, TicketCategory } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
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
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.h1}>{t('support.title')}</Text>
          <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
            <Icon name={showForm ? 'x' : 'plus'} size={18} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {showForm && (
          <Card>
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
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState icon="help-circle" title={t('support.none')} />
        ) : (
          items.map((tk) => (
            <Card key={tk.id}>
              <View style={s.row}>
                <Text style={s.cardTitle} numberOfLines={1}>{tk.subject}</Text>
                <Badge label={tk.status_label} tone={tk.status === 'resolved' ? 'success' : 'primary'} />
              </View>
              <Text style={s.meta}>{tk.number} · {tk.category_label}</Text>
              {tk.last_reply_at && <Text style={s.meta}>{new Date(tk.last_reply_at).toLocaleString(locale)}</Text>}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.sm },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 6, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    multiline: { height: 110, textAlignVertical: 'top', paddingTop: 10 },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, flex: 1, textAlign: 'right' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  });
