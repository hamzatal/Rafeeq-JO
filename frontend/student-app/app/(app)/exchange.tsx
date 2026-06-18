import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ExchangeItem, ExchangeType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const TYPES: ExchangeType[] = ['book', 'notes', 'tool', 'other'];

export default function Exchange() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ExchangeType>('book');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.exchange.list());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (title.trim().length < 2) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.exchange.create({ type, title, description: desc || undefined });
      setMsg({ text: t('exchange.listed'), ok: true });
      setTitle(''); setDesc('');
      setShowForm(false);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const reserve = async (id: string) => {
    try {
      await api.exchange.reserve(id);
      setMsg({ text: t('exchange.reserved'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.h1}>{t('exchange.title')}</Text>
          <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
            <Icon name={showForm ? 'x' : 'plus'} size={18} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {showForm && (
          <Card>
            <View style={s.chips}>
              {TYPES.map((ty) => (
                <Pressable key={ty} onPress={() => setType(ty)} style={[s.chip, type === ty && s.chipActive]}>
                  <Text style={[s.chipText, type === ty && s.chipTextActive]}>{t(`exchange.${ty}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Input label={t('exchange.itemTitle')} value={title} onChangeText={setTitle} />
            <Input label={t('exchange.description')} value={desc} onChangeText={setDesc} />
            <Button title={t('exchange.newItem')} onPress={submit} loading={busy} />
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState icon="repeat" title={t('exchange.none')} />
        ) : (
          items.map((it) => (
            <Card key={it.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{it.title}</Text>
                <Badge label={t(`exchange.${it.type}`)} tone="primary" />
              </View>
              <Text style={s.price}>{it.price_fils ? `${(it.price_fils / 1000).toFixed(3)} ${t('subscriptions.currency')}` : t('exchange.free')}</Text>
              {it.description ? <Text style={s.meta}>{it.description}</Text> : null}
              <Pressable onPress={() => reserve(it.id)} style={s.reserveBtn}>
                <Text style={s.reserveText}>{t('exchange.reserve')}</Text>
              </Pressable>
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
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.base },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 8, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, flex: 1, textAlign: 'right' },
    price: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary, textAlign: 'right', marginTop: 4 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    reserveBtn: { marginTop: t.spacing.sm, borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 8, alignItems: 'center' },
    reserveText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary },
  });
