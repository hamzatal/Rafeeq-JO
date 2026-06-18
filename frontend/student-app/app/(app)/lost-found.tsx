import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LostFoundItem, LostFoundType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
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

  useEffect(() => { void load(); }, [load]);

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
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.h1}>{t('lostFound.title')}</Text>
          <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
            <Icon name={showForm ? 'x' : 'plus'} size={18} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {showForm && (
          <Card>
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
          </Card>
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
          <EmptyState icon="search" title={t('lostFound.none')} />
        ) : (
          items.map((it) => (
            <Card key={it.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{it.title}</Text>
                <Badge label={it.type === 'lost' ? t('lostFound.lost') : t('lostFound.found')} tone={it.type === 'lost' ? 'danger' : 'success'} />
              </View>
              {it.description ? <Text style={s.meta}>{it.description}</Text> : null}
              {it.location ? <Text style={s.meta}>📍 {it.location}</Text> : null}
              {it.created_at && <Text style={s.meta}>{new Date(it.created_at).toLocaleDateString(locale)}</Text>}
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
    chips: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginBottom: t.spacing.base },
    chip: { flex: 1, paddingVertical: 10, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    filterRow: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginBottom: t.spacing.base },
    filterChip: { paddingHorizontal: t.spacing.base, paddingVertical: 6, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, flex: 1, textAlign: 'right' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  });
