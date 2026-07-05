import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import type { ColorScheme, Locale } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';
import { useTheme, type AppTheme } from '../../src/theme';
import { Card, ListRow, SectionTitle } from '../../src/components/ui';
import { SegmentedControl } from '../../src/components/kit';
import { Icon, type IconName } from '../../src/components/Icon';

export default function Settings() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const locale = usePrefs((p) => p.locale);
  const scheme = usePrefs((p) => p.scheme);
  const setLocale = usePrefs((p) => p.setLocale);
  const setScheme = usePrefs((p) => p.setScheme);
  const logout = useAuth((a) => a.logout);

  const links: { icon: IconName; label: string; href: string }[] = [
    { icon: 'file-text', label: t('driver.documents'), href: '/(app)/documents' },
    { icon: 'truck', label: t('driver.vehicle'), href: '/(app)/vehicle' },
    { icon: 'credit-card', label: t('driver.earnings'), href: '/(app)/earnings' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.profile}>
          <View style={s.avatar}><Text style={s.avatarText}>{(user?.full_name ?? 'ر').charAt(0)}</Text></View>
          <Text style={s.name}>{user?.full_name ?? ''}</Text>
          <Text style={s.phone}>{user?.phone ?? ''}</Text>
        </View>

        <SectionTitle title={t('settings.account')} />
        <Card style={{ padding: 6 }}>
          {links.map((l) => (
            <ListRow key={l.href} icon={l.icon} title={l.label} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push(l.href as never)} />
          ))}
        </Card>

        <SectionTitle title={t('settings.appearance')} />
        <Card>
          <Text style={s.label}>{t('settings.language')}</Text>
          <SegmentedControl<Locale> value={locale} onChange={setLocale} options={[{ value: 'ar', label: t('settings.arabic') }, { value: 'en', label: t('settings.english') }]} />
          <View style={s.divider} />
          <Text style={s.label}>{t('settings.theme')}</Text>
          <SegmentedControl<ColorScheme> value={scheme} onChange={setScheme} options={[{ value: 'light', label: t('settings.light') }, { value: 'dark', label: t('settings.dark') }]} />
        </Card>

        <Pressable style={s.logoutBtn} onPress={logout}>
          <Icon name="log-out" size={18} color={theme.colors.danger} />
          <Text style={s.logout}>{t('auth.logout')}</Text>
        </Pressable>

        <Text style={s.version}>{t('settings.version')} {Constants.expoConfig?.version ?? '0.1.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    profile: { alignItems: 'center', marginBottom: t.spacing.base },
    avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: t.colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm, ...t.shadow.md },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 32, color: t.colors.onInk },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text },
    phone: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, marginTop: 2 },
    label: { fontFamily: t.fontFamily.medium, fontSize: 15, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    divider: { height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing.base },
    logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: t.spacing.lg, paddingVertical: t.spacing.base, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.danger },
    logout: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.danger },
    version: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'center', marginTop: t.spacing.lg },
  });
