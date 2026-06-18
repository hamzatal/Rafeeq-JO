import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GuardianLink } from '@rafeeq/shared';
import { isValidJordanPhone, normalizeJordanPhone } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card, EmptyState, SectionTitle } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const RELATIONS = ['father', 'mother', 'parent', 'sibling', 'other'] as const;

export default function Guardians() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<string>('parent');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const relationLabel = (r: string) =>
    ({
      father: t('guardians.relationFather'),
      mother: t('guardians.relationMother'),
      parent: t('guardians.relationParent'),
      sibling: t('guardians.relationSibling'),
      other: t('guardians.relationOther'),
    }[r] ?? r);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLinks(await api.studentGuardians.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    setMsg(null);
    if (!isValidJordanPhone(phone)) {
      setMsg({ text: t('validation.invalidPhone'), ok: false });
      return;
    }
    setBusy(true);
    try {
      await api.studentGuardians.add({ phone: normalizeJordanPhone(phone)!, relation });
      setMsg({ text: t('guardians.added'), ok: true });
      setPhone('');
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (link: GuardianLink) => {
    setMsg(null);
    try {
      await api.studentGuardians.revoke(link.id);
      setMsg({ text: t('guardians.revoked'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    }
  };

  const active = links.filter((l) => l.status !== 'revoked');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('guardians.title')}</Text>
        <Text style={s.sub}>{t('guardians.subtitle')}</Text>

        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        <Card>
          <Text style={s.formTitle}>{t('guardians.add')}</Text>
          <Input
            label={t('guardians.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="07XXXXXXXX"
          />
          <Text style={s.relLabel}>{t('guardians.relation')}</Text>
          <View style={s.relRow}>
            {RELATIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRelation(r)}
                style={[s.chip, relation === r && s.chipActive]}
              >
                <Text style={[s.chipText, relation === r && s.chipTextActive]}>{relationLabel(r)}</Text>
              </Pressable>
            ))}
          </View>
          <Button title={t('guardians.addBtn')} onPress={add} loading={busy} />
        </Card>

        <SectionTitle title={t('guardians.list')} />
        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : active.length === 0 ? (
          <EmptyState icon="users" title={t('guardians.none')} />
        ) : (
          active.map((link) => (
            <Card key={link.id}>
              <View style={s.row}>
                <View style={s.rowIcon}>
                  <Icon name="shield" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{link.guardian?.name ?? '—'}</Text>
                  <Text style={s.meta}>
                    {link.guardian?.phone} · {relationLabel(link.relation)}
                  </Text>
                </View>
                <Pressable onPress={() => revoke(link)} style={s.revokeBtn}>
                  <Text style={s.revokeText}>{t('guardians.revoke')}</Text>
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
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    sub: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.base },
    formTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    relLabel: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.xs, marginBottom: 6 },
    relRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: t.spacing.sm },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    chipTextActive: { color: t.colors.onPrimary },
    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.md, backgroundColor: `${t.colors.danger}1A` },
    revokeText: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.danger },
  });
