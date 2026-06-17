import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import type { ColorScheme, Locale } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Settings() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const locale = usePrefs((p) => p.locale);
  const scheme = usePrefs((p) => p.scheme);
  const setLocale = usePrefs((p) => p.setLocale);
  const setScheme = usePrefs((p) => p.setScheme);
  const logout = useAuth((a) => a.logout);

  const Segment = <T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) => (
    <View style={s.segment}>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <Pressable key={o.v} onPress={() => onChange(o.v)} style={[s.segItem, active && s.segActive]}>
            <Text style={[s.segText, active && s.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.h1}>{t('settings.title')}</Text>

        <Text style={s.section}>{t('settings.appearance')}</Text>
        <View style={s.card}>
          <Text style={s.label}>{t('settings.language')}</Text>
          <Segment<Locale> value={locale} onChange={setLocale} options={[{ v: 'ar', label: t('settings.arabic') }, { v: 'en', label: t('settings.english') }]} />
          <View style={s.divider} />
          <Text style={s.label}>{t('settings.theme')}</Text>
          <Segment<ColorScheme> value={scheme} onChange={setScheme} options={[{ v: 'light', label: t('settings.light') }, { v: 'dark', label: t('settings.dark') }]} />
        </View>

        <Text style={s.section}>{t('settings.account')}</Text>
        <Pressable style={s.card} onPress={logout}><Text style={s.logout}>{t('auth.logout')}</Text></Pressable>

        <Text style={s.version}>{t('settings.version')} {Constants.expoConfig?.version ?? '0.1.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base },
    label: { fontFamily: t.fontFamily.medium, fontSize: 15, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    segment: { flexDirection: 'row-reverse', backgroundColor: t.colors.background, borderRadius: t.radius.md, padding: 4, gap: 4 },
    segItem: { flex: 1, paddingVertical: 8, borderRadius: t.radius.sm, alignItems: 'center' },
    segActive: { backgroundColor: t.colors.primary },
    segText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary },
    segTextActive: { color: t.colors.onPrimary },
    divider: { height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing.base },
    logout: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.danger, textAlign: 'right' },
    version: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'center', marginTop: t.spacing.xl },
  });
