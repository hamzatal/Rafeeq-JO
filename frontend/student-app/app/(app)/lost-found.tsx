import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LostFoundItem, LostFoundStatus, LostFoundType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Icon, type IconName } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/store/auth';
import { pickProof } from '../../src/lib/proof';
import { useTheme, type AppTheme } from '../../src/theme';

const STATUS: Record<LostFoundStatus, { key: string; tone: 'accent' | 'muted' | 'primary' }> = {
  matched: { key: 'lostFound.statusMatched', tone: 'accent' },
  open: { key: 'lostFound.statusSearching', tone: 'primary' },
  resolved: { key: 'lostFound.statusResolved', tone: 'muted' },
};

function timeAgo(iso: string | null, locale: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 7) return new Date(iso).toLocaleDateString(locale);
  if (d >= 1) return locale === 'ar' ? `منذ ${d} يوم` : `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return locale === 'ar' ? `منذ ${h} ساعة` : `${h}h ago`;
  return locale === 'ar' ? 'الآن' : 'now';
}

export default function LostFound() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((st) => st.user);

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [type, setType] = useState<LostFoundType>('lost');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [when, setWhen] = useState('');
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.lostFound.list({}));
    } catch {
      /* silent */
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const pickPhoto = async () => {
    const file = await pickProof();
    if (file && 'uri' in (file as object)) setPhoto({ uri: (file as unknown as { uri: string }).uri });
  };

  const submit = async () => {
    if (title.trim().length < 2) return setMsg({ text: t('lostFound.failed'), ok: false });
    setBusy(true);
    setMsg(null);
    try {
      const description = [desc.trim(), when.trim() ? `${t('lostFound.dateTime') ?? ''}: ${when.trim()}` : '']
        .filter(Boolean)
        .join('\n');
      await api.lostFound.report({ type, title: title.trim(), description: description || undefined, location: location || undefined });
      setMsg({ text: t('lostFound.reported'), ok: true });
      setTitle(''); setDesc(''); setLocation(''); setWhen(''); setPhoto(null);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('lostFound.failed'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const mine = items.filter((it) => it.reporter_id === user?.id);
  const active = (showAll ? items : mine).filter((it) => it.status !== 'resolved');
  const activeCount = mine.filter((it) => it.status !== 'resolved').length;
  const iconFor = (cat: string): IconName => {
    const c = cat?.toLowerCase() ?? '';
    if (c.includes('bag') || c.includes('wallet') || c.includes('حقيب') || c.includes('محفظ')) return 'briefcase';
    if (c.includes('phone') || c.includes('head') || c.includes('سماع')) return 'headphones';
    if (c.includes('key') || c.includes('مفتاح')) return 'key';
    return 'package';
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('lostFound.smartTitle')}</Text>
        <Text style={s.subtitle}>{t('lostFound.smartSubtitle')}</Text>

        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {/* Form card */}
        <View style={s.card}>
          {/* lost / found toggle */}
          <View style={s.segment}>
            <Pressable onPress={() => setType('lost')} style={[s.segBtn, type === 'lost' && s.segBtnOn]}>
              <Text style={[s.segText, type === 'lost' && s.segTextOn]}>{t('lostFound.lostTab')}</Text>
            </Pressable>
            <Pressable onPress={() => setType('found')} style={[s.segBtn, type === 'found' && s.segBtnOn]}>
              <Text style={[s.segText, type === 'found' && s.segTextOn]}>{t('lostFound.foundTab')}</Text>
            </Pressable>
          </View>

          <FieldWithIcon icon="box" theme={theme}>
            <Input label={t('lostFound.itemTitle')} value={title} onChangeText={setTitle} placeholder={t('lostFound.itemNameHint')} />
          </FieldWithIcon>
          <FieldWithIcon icon="map-pin" theme={theme}>
            <Input label={t('lostFound.locationLabel')} value={location} onChangeText={setLocation} placeholder={t('lostFound.locationHint')} />
          </FieldWithIcon>
          <FieldWithIcon icon="clock" theme={theme}>
            <Input label={t('lostFound.dateTime') ?? 'الوقت والتاريخ'} value={when} onChangeText={setWhen} placeholder="mm/dd/yyyy --:--" />
          </FieldWithIcon>
          <Input label={t('lostFound.descLabel')} value={desc} onChangeText={setDesc} placeholder={t('lostFound.descHint')} multiline numberOfLines={3} style={s.textarea} />

          {/* image upload */}
          <Text style={s.uploadCaption}>{t('lostFound.imageOptional')}</Text>
          <Pressable onPress={pickPhoto} style={s.upload}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={s.uploadPreview} resizeMode="cover" />
            ) : (
              <>
                <View style={s.uploadIcon}>
                  <Icon name="image" size={22} color={theme.colors.accent} />
                </View>
                <Text style={s.uploadHint}>{t('lostFound.uploadHint')}</Text>
                <Text style={s.uploadTypes}>{t('lostFound.uploadTypes')}</Text>
              </>
            )}
          </Pressable>

          <Button title={t('lostFound.submitReport')} icon="send" onPress={submit} loading={busy} style={{ marginTop: theme.spacing.base }} />
        </View>

        {/* Active reports */}
        <View style={s.card}>
          <View style={s.reportsHead}>
            <View style={s.countBadge}>
              <Text style={s.countText}>{activeCount} {t('lostFound.active')}</Text>
            </View>
            <Text style={s.sectionTitle}>{t('lostFound.activeReports')}</Text>
          </View>

          {active.length === 0 ? (
            <Text style={s.none}>{t('lostFound.none')}</Text>
          ) : (
            active.slice(0, showAll ? undefined : 5).map((it) => {
              const st = STATUS[it.status] ?? STATUS.open;
              const tone = st.tone === 'accent' ? theme.colors.accent : st.tone === 'muted' ? theme.colors.muted : theme.colors.primary;
              return (
                <View key={it.id} style={s.reportRow}>
                  <View style={[s.statusPill, { backgroundColor: tone + '1A' }]}>
                    <View style={[s.statusDot, { backgroundColor: tone }]} />
                    <Text style={[s.statusText, { color: tone }]}>{t(st.key)}</Text>
                  </View>
                  <View style={s.reportInfo}>
                    <Text style={s.reportTitle} numberOfLines={1}>{it.title}</Text>
                    <Text style={s.reportTime}>{timeAgo(it.created_at, locale)}</Text>
                  </View>
                  <View style={s.reportIcon}>
                    <Icon name={iconFor(it.category)} size={20} color={theme.colors.primary} />
                  </View>
                </View>
              );
            })
          )}

          <Pressable onPress={() => setShowAll((v) => !v)} style={s.viewAll}>
            <Text style={s.viewAllText}>{t('lostFound.viewFull')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldWithIcon({ icon, theme, children }: { icon: IconName; theme: AppTheme; children: React.ReactNode }) {
  return (
    <View style={{ position: 'relative' }}>
      {children}
      <View style={{ position: 'absolute', left: 12, bottom: 16 }}>
        <Icon name={icon} size={18} color={theme.colors.muted} />
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.primary, textAlign: 'center' },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 14, lineHeight: 22, color: t.colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: t.spacing.lg },

    card: { backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.lg, marginBottom: t.spacing.lg, ...t.shadow.sm },

    segment: { flexDirection: 'row-reverse', backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: 4, marginBottom: t.spacing.base },
    segBtn: { flex: 1, paddingVertical: 10, borderRadius: t.radius.sm, alignItems: 'center' },
    segBtnOn: { backgroundColor: t.colors.primary },
    segText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary },
    segTextOn: { fontFamily: t.fontFamily.bold, color: t.colors.onPrimary },

    textarea: { height: 90, textAlignVertical: 'top', paddingTop: 12 },

    uploadCaption: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', marginTop: t.spacing.sm, marginBottom: t.spacing.sm },
    upload: { borderWidth: 1.5, borderColor: t.colors.border, borderStyle: 'dashed', borderRadius: t.radius.md, paddingVertical: t.spacing.lg, alignItems: 'center', gap: 6, overflow: 'hidden' },
    uploadIcon: { width: 48, height: 48, borderRadius: t.radius.md, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    uploadHint: { fontFamily: t.fontFamily.semibold, fontSize: 13, color: t.colors.text },
    uploadTypes: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted },
    uploadPreview: { width: '100%', height: 140, borderRadius: t.radius.sm },

    reportsHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },
    sectionTitle: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.primary, textAlign: 'right' },
    countBadge: { backgroundColor: t.colors.primary, borderRadius: t.radius.full, paddingHorizontal: 10, paddingVertical: 3 },
    countText: { fontFamily: t.fontFamily.bold, fontSize: 11, color: t.colors.onPrimary },
    none: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.muted, textAlign: 'center', paddingVertical: t.spacing.base },

    reportRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.sm },
    reportIcon: { width: 48, height: 48, borderRadius: t.radius.md, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    reportInfo: { flex: 1 },
    reportTitle: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    reportTime: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.full },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: t.fontFamily.semibold, fontSize: 11 },

    viewAll: { marginTop: t.spacing.md, borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md, paddingVertical: 12, alignItems: 'center' },
    viewAllText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
  });
