import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';

export default function Settings() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const logout = useAuth((a) => a.logout);
  const locale = usePrefs((p) => p.locale);
  const scheme = usePrefs((p) => p.scheme);
  const setLocale = usePrefs((p) => p.setLocale);
  const setScheme = usePrefs((p) => p.setScheme);

  const initial = (user?.full_name ?? 'ر').charAt(0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — bell · Rafeeq · avatar */}
      <View style={s.header}>
        <Pressable onPress={() => router.push('/(app)/notifications')} hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={s.brand}>رفيق</Text>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* General */}
        <Text style={s.section}>{t('settings.general')}</Text>
        <SettingRow
          theme={theme}
          icon="globe"
          title={t('settings.appLanguage')}
          subtitle={locale === 'ar' ? t('settings.arabic') : t('settings.english')}
          onPress={() => void setLocale(locale === 'ar' ? 'en' : 'ar')}
        />
        <SettingRow
          theme={theme}
          icon={scheme === 'dark' ? 'moon' : 'sun'}
          title={t('settings.theme')}
          subtitle={scheme === 'dark' ? t('settings.dark') : t('settings.light')}
          onPress={() => void setScheme(scheme === 'dark' ? 'light' : 'dark')}
        />
        <SettingRow
          theme={theme}
          icon="bell"
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsDesc')}
          onPress={() => router.push('/(app)/notifications')}
        />
        <SettingRow
          theme={theme}
          icon="alert-circle"
          title={t('settings.emergencyContact')}
          subtitle={t('settings.emergencyDesc')}
          onPress={() => router.push('/(app)/emergency')}
          danger
        />

        {/* Support center */}
        <Text style={s.section}>{t('settings.supportCenter')}</Text>
        <View style={s.supportRow}>
          <SupportCard theme={theme} icon="headphones" label={t('settings.contactUs')} onPress={() => router.push('/(app)/support')} />
          <SupportCard theme={theme} icon="help-circle" label={t('settings.faq')} onPress={() => router.push('/(app)/support')} />
        </View>
        <Pressable onPress={() => router.push('/(app)/lost-found')} style={({ pressed }) => [s.lostCard, pressed && { opacity: 0.9 }]}>
          <View style={s.lostIcon}>
            <Icon name="search" size={20} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lostTitle}>{t('settings.reportLost')}</Text>
            <Text style={s.lostSub}>{t('settings.aiPowered')}</Text>
          </View>
          <Icon name="chevron-left" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {/* Legal */}
        <Text style={s.section}>{t('settings.legal')}</Text>
        <SettingRow theme={theme} icon="shield" title={t('settings.privacy')} onPress={() => router.push('/(app)/support')} compact />
        <SettingRow theme={theme} icon="file-text" title={t('settings.terms')} onPress={() => router.push('/(app)/support')} compact />

        {/* Logout */}
        <Pressable style={s.logoutBtn} onPress={logout}>
          <Icon name="log-out" size={18} color={theme.colors.danger} />
          <Text style={s.logout}>{t('auth.logout')}</Text>
        </Pressable>

        <Text style={s.version}>{t('settings.version')} {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  theme,
  icon,
  title,
  subtitle,
  onPress,
  danger,
  compact,
}: {
  theme: AppTheme;
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  compact?: boolean;
}) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, danger && s.rowDanger, pressed && { opacity: 0.7 }]}>
      <View style={[s.rowIcon, danger && s.rowIconDanger, compact && s.rowIconCompact]}>
        <Icon name={icon} size={compact ? 18 : 20} color={danger ? theme.colors.danger : theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, danger && { color: theme.colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron-left" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

function SupportCard({ theme, icon, label, onPress }: { theme: AppTheme; icon: IconName; label: string; onPress: () => void }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.supportCard, pressed && { opacity: 0.8 }]}>
      <View style={s.supportIcon}>
        <Icon name={icon} size={22} color={theme.colors.accent} />
      </View>
      <Text style={s.supportLabel}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.onPrimary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    section: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.primary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.md },

    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, paddingHorizontal: t.spacing.base, paddingVertical: 14, marginBottom: t.spacing.sm },
    rowDanger: { backgroundColor: t.colors.dangerSoft, borderColor: t.colors.dangerSoft },
    rowIcon: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    rowIconCompact: { width: 38, height: 38, backgroundColor: 'transparent' },
    rowIconDanger: { backgroundColor: t.colors.surface },
    rowTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    rowSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    supportRow: { flexDirection: 'row-reverse', gap: t.spacing.md, marginBottom: t.spacing.sm },
    supportCard: { flex: 1, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, paddingVertical: t.spacing.lg, alignItems: 'center', gap: 8 },
    supportIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    supportLabel: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.text },

    lostCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.primary, borderRadius: t.radius.lg, padding: t.spacing.base, ...t.shadow.md },
    lostIcon: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    lostTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: '#FFFFFF', textAlign: 'right' },
    lostSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: '#6FF7EE', textAlign: 'right', marginTop: 2 },

    logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: t.spacing.xl, paddingVertical: t.spacing.base, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.danger },
    logout: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.danger },
    version: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'center', marginTop: t.spacing.lg },
  });
