import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LostFoundItem, LostFoundType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function LostFound() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [filter, setFilter] = useState<LostFoundType | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<LostFoundType>('lost');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.lostFound.list(filter ? { type: filter } : {}));
    } catch {
      /* silent */
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (title.trim().length < 2) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.lostFound.report({ type, title, description: desc || undefined, location: location || undefined });
      setMsg({ text: t('lostFound.reported'), ok: true });
      setTitle(''); setDesc(''); setLocation('');
      setShowForm(false);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('lostFound.failed'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={s.headerRow}>
        <Text style={s.h1}>{t('lostFound.title')}</Text>
        <Pressable onPress={() => setShowForm((v) => !v)}>
          <Text style={s.link}>＋ {t('lostFound.report')}</Text>
        </Pressable>
      </View>
      {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

      {showForm && (
        <View style={s.card}>
          <View style={s.chips}>
            <Pressable onPress={() => setType('lost')} style={[s.chip, type === 'lost' && s.chipActive]}>
              <Text style={[s.chipText, type === 'lost' && s.chipTextActive]}>{t('lostFound.lost')}</Text>
            </Pressable>
            <Pressable onPress={() => setType('found')} style={[s.chip, type === 'found' && s.chipActive]}>
              <Text style={[s.chipText, type === 'found' && s.chipTextActive]}>{t('lostFound.found')}</Text>
            </Pressable>
          </View>
          <Input label={t('lostFound.itemTitle')} value={title} onChangeText={setTitle} />
          <Input label={t('lostFound.description')} value={desc} onChangeText={setDesc} />
          <Input label={t('lostFound.location')} value={location} onChangeText={setLocation} />
          <Button title={t('lostFound.report')} onPress={submit} loading={busy} />
        </View>
      )}

      <View style={s.filterRow}>
        {(['', 'lost', 'found'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[s.filterChip, filter === f && s.chipActive]}>
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f === '' ? t('lostFound.browse') : f === 'lost' ? t('lostFound.lost') : t('lostFound.found')}
            </Text>
          </Pressable>
        ))}
      </View>

      {items.length === 0 ? (
        <Text style={s.meta}>{t('lostFound.none')}</Text>
      ) : (
        items.map((it) => (
          <View key={it.id} style={s.card}>
            <View style={s.row}>
              <Text style={s.cardTitle}>{it.title}</Text>
              <Text style={[s.badge, { color: it.type === 'lost' ? theme.colors.danger : theme.colors.success }]}>
                {it.type === 'lost' ? t('lostFound.lost') : t('lostFound.found')}
              </Text>
            </View>
            {it.description ? <Text style={s.meta}>{it.description}</Text> : null}
            {it.location ? <Text style={s.meta}>📍 {it.location}</Text> : null}
            {it.created_at && <Text style={s.meta}>{new Date(it.created_at).toLocaleDateString(locale)}</Text>}
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
    chips: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginBottom: t.spacing.base },
    chip: { flex: 1, paddingVertical: 10, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: `${t.colors.primary}1A` },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    filterRow: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginBottom: t.spacing.base },
    filterChip: { paddingHorizontal: t.spacing.base, paddingVertical: 6, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, flex: 1, textAlign: 'right' },
    badge: { fontFamily: t.fontFamily.bold, fontSize: 12, marginRight: 8 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  });
