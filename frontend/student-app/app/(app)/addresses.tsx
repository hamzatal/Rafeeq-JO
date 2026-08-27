import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SavedAddress } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Badge, Banner, Button, Card, EmptyState, Icon, Input, ListState, SectionTitle, listLabels, statusFromError, useTheme, type AppTheme, type IconName, type ListStatus } from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';

const LABELS = ['home', 'university', 'work', 'other'] as const;
const LABEL_ICON: Record<string, IconName> = { home: 'house', university: 'book', work: 'briefcase', other: 'map-pin' };

export default function Addresses() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [list, setList] = useState<SavedAddress[]>([]);
  const [label, setLabel] = useState<string>('home');
  const [text, setText] = useState('');
  /*
   * `status` replaced a bare `loading` boolean here.
   *
   * The old pair — `loading` plus an implicit "not loading means we have data" —
   * is exactly what left no room for failure: there were two states for three
   * outcomes, so the third one borrowed the empty state.
   */
  const [status, setStatus] = useState<ListStatus>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const labelText = (l: string) =>
    ({ home: t('addresses.home'), university: t('addresses.university'), work: t('addresses.work'), other: t('addresses.other') }[l] ?? l);

  /*
   * There was no `catch` at all — only `finally`. So a rejected promise cleared the
   * loading flag and the screen fell through to «لا عناوين محفوظة», then the
   * unhandled rejection went to the console nobody is reading.
   */
  const load = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      setList(await api.addresses.list());
      setStatus({ kind: 'ready' });
    } catch (e) {
      setStatus(statusFromError(e));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    setMsg(null);
    if (!text.trim()) return setMsg({ text: t('validation.required'), ok: false });
    setBusy(true);
    try {
      await api.addresses.create({ label, address_text: text.trim() });
      setText('');
      setMsg({ text: t('addresses.saved'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: SavedAddress) => {
    try {
      await api.addresses.remove(a.id);
      setMsg({ text: t('addresses.deleted'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    }
  };

  const makeDefault = async (a: SavedAddress) => {
    try {
      await api.addresses.setDefault(a.id);
      await load();
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('addresses.title')}</Text>
        <Text style={s.sub}>{t('addresses.subtitle')}</Text>

        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        <Card>
          <Text style={s.formTitle}>{t('addresses.add')}</Text>
          <Text style={s.relLabel}>{t('addresses.label')}</Text>
          <View style={s.relRow}>
            {LABELS.map((l) => (
              <Pressable key={l} onPress={() => setLabel(l)} style={[s.chip, label === l && s.chipActive]}>
                <Text style={[s.chipText, label === l && s.chipTextActive]}>{labelText(l)}</Text>
              </Pressable>
            ))}
          </View>
          <Input label={t('addresses.addressText')} value={text} onChangeText={setText} placeholder="..." />
          <Button title={t('addresses.save')} onPress={add} loading={busy} />
        </Card>

        <SectionTitle title={t('addresses.title')} />
        {status.kind !== 'ready' ? (
          <ListState status={status} onRetry={load} labels={listLabels(t)} />
        ) : list.length === 0 ? (
          <EmptyState icon="map-pin" title={t('addresses.none')} />
        ) : (
          list.map((a) => (
            <Card key={a.id}>
              <View style={s.row}>
                <View style={s.rowIcon}>
                  <Icon name={LABEL_ICON[a.label] ?? 'map-pin'} size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.name}>{a.title || labelText(a.label)}</Text>
                    {a.is_default && <Badge label={t('addresses.default')} tone="success" />}
                  </View>
                  <Text style={s.meta}>{a.address_text}</Text>
                </View>
              </View>
              <View style={s.actions}>
                {!a.is_default && (
                  <Pressable onPress={() => makeDefault(a)} style={s.actionBtn}>
                    <Text style={s.actionText}>{t('addresses.setDefault')}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => remove(a)} style={[s.actionBtn, s.deleteBtn]}>
                  <Text style={[s.actionText, { color: theme.colors.danger }]}>{t('addresses.delete')}</Text>
                </Pressable>
              </View>
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
    h1: { fontFamily: t.fontFamily.bold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    sub: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.base },
    formTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    relLabel: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginBottom: 6 },
    relRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: t.spacing.sm },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    chipTextActive: { color: t.colors.onPrimary },
    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    name: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    actions: { flexDirection: 'row-reverse', gap: 8, marginTop: t.spacing.sm },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.control, backgroundColor: t.colors.primarySoft },
    deleteBtn: { backgroundColor: `${t.colors.danger}1A` },
    actionText: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.primary },
  });
