import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';

/**
 * Captain Settings & Support — pixel-faithful to Stitch `_23`:
 * header (avatar · Rafeeq · bell) → title + subtitle → "إعدادات الحساب"
 * grouped card → gradient "مركز الدعم" card → legal rows → centered logout pill.
 */
export default function Settings() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const logout = useAuth((a) => a.logout);
  const locale = usePrefs((p) => p.locale);
  const setLocale = usePrefs((p) => p.setLocale);

  const initial = (user?.full_name ?? 'ر').charAt(0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — avatar (right) · Rafeeq · bell (left) */}
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
        <Text style={s.brand}>رفيق</Text>
        <Pressable hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{t('settings.settingsSupport')}</Text>
        <Text style={s.subtitle}>{t('settings.manageAccount')}</Text>

        {/* Account settings — grouped card with divided rows */}
        <Text style={s.section}>{t('settings.account')}</Text>
        <View style={s.groupCard}>
          <GroupRow theme={theme} icon="globe" title={t('settings.appLanguage')} subtitle={locale === 'ar' ? t('settings.arabic') : t('settings.english')} onPress={() => void setLocale(locale === 'ar' ? 'en' : 'ar')} border />
          <GroupRow theme={theme} icon="file-text" title={t('driver.documents')} onPress={() => router.push('/(app)/documents')} border />
          <GroupRow theme={theme} icon="truck" title={t('driver.vehicle')} onPress={() => router.push('/(app)/vehicle')} border />
          <GroupRow theme={theme} icon="credit-card" title={t('driver.wallet')} onPress={() => router.push('/(app)/earnings')} />
        </View>

        {/* Support center — navy gradient-approx card */}
        <View style={s.supportCard}>
          <View style={s.supportBlob} pointerEvents="none" />
          <View style={s.supportIcon}>
            <Icon name="headphones" size={26} color={theme.colors.accentBright} />
          </View>
          <Text style={s.supportTitle}>{t('settings.supportCenter')}</Text>
          <Text style={s.supportDesc}>{t('settings.supportDesc')}</Text>
          <Pressable onPress={() => router.push('/(app)/chat')} style={({ pressed }) => [s.supportBtn, pressed && { opacity: 0.9 }]}>
            <Icon name="message-circle" size={18} color={theme.colors.onAccent} />
            <Text style={s.supportBtnText}>{t('settings.chatWithUs')}</Text>
          </Pressable>
          <View style={s.supportMeta}>
            <Icon name="clock" size={16} color={theme.colors.onPrimaryMuted} />
            <Text style={s.supportMetaText}>{t('settings.avgResponse')}</Text>
          </View>
        </View>

        {/* Legal */}
        <Text style={s.section}>{t('settings.legal')}</Text>
        <View style={s.groupCard}>
          <GroupRow theme={theme} icon="shield" title={t('settings.privacy')} onPress={() => router.push('/(app)/chat')} border />
          <GroupRow theme={theme} icon="file-text" title={t('settings.terms')} onPress={() => router.push('/(app)/chat')} />
        </View>

        {/* Logout — centered pill */}
        <View style={s.logoutWrap}>
          <Pressable style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.9 }]} onPress={logout}>
            <Icon name="log-out" size={18} color={theme.colors.danger} />
            <Text style={s.logout}>{t('auth.logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupRow({ theme, icon, title, subtitle, onPress, border }: { theme: AppTheme; icon: IconName; title: string; subtitle?: string; onPress: () => void; border?: boolean }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, border && s.rowBorder, pressed && { backgroundColor: theme.colors.surfaceAlt }]}>
      <View style={s.rowIcon}>
        <Icon name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron-left" size={20} color={theme.colors.muted} />
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, backgroundColor: t.colors.surface, ...t.shadow.sm },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 32, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    title: { fontFamily: t.fontFamily.extrabold, fontSize: 32, lineHeight: 40, color: t.colors.primary, textAlign: 'right' },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 16, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'right', marginTop: 8, marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.semibold, fontSize: 20, color: t.colors.primary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.md },

    groupCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden', ...t.shadow.sm },
    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, padding: t.spacing.base },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontFamily: t.fontFamily.medium, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    rowSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    // Support center card
    supportCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.xl, padding: t.spacing.lg, marginTop: t.spacing.lg, overflow: 'hidden', ...t.shadow.md },
    supportBlob: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: t.colors.accent, opacity: 0.2 },
    supportIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.md },
    supportTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 32, color: t.colors.onPrimary, textAlign: 'right', marginBottom: 6 },
    supportDesc: { fontFamily: t.fontFamily.regular, fontSize: 12, lineHeight: 18, color: t.colors.onPrimaryMuted, textAlign: 'right', marginBottom: t.spacing.lg },
    supportBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.accent, borderRadius: t.radius.md, paddingVertical: 12 },
    supportBtnText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.onAccent },
    supportMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: t.spacing.base, paddingTop: t.spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
    supportMetaText: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.onPrimaryMuted },

    logoutWrap: { alignItems: 'center', paddingTop: t.spacing.xl, paddingBottom: t.spacing.base },
    logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: t.spacing.xl, paddingVertical: 12, borderRadius: 9999, backgroundColor: t.colors.dangerSoft },
    logout: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.danger },
  });
