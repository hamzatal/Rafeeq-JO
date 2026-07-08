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
 * Settings & Support — pixel-faithful to Stitch `_19`:
 * header (avatar right · Rafeeq · bell left) → "الإعدادات العامة" (language,
 * notifications, emergency) → "مركز الدعم" (contact, FAQ, AI lost-&-found
 * gradient card) → "قانوني" (privacy, terms) → centered logout pill.
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
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <Text style={s.brand}>رفيق</Text>
        <Pressable onPress={() => router.push('/(app)/notifications')} hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={24} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* General settings */}
        <Text style={s.section}>{t('settings.general')}</Text>
        <GeneralRow
          theme={theme}
          icon="globe"
          title={t('settings.appLanguage')}
          subtitle={locale === 'ar' ? t('settings.arabic') : t('settings.english')}
          onPress={() => void setLocale(locale === 'ar' ? 'en' : 'ar')}
        />
        <GeneralRow
          theme={theme}
          icon="bell"
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsDesc')}
          onPress={() => router.push('/(app)/notifications')}
        />
        <GeneralRow
          theme={theme}
          icon="alert-triangle"
          title={t('settings.emergencyContact')}
          subtitle={t('settings.emergencyDesc')}
          onPress={() => router.push('/(app)/emergency')}
          danger
        />

        {/* Support center — stacked cards (grid-cols-1 on mobile) */}
        <Text style={[s.section, { marginTop: theme.spacing.xl }]}>{t('settings.supportCenter')}</Text>
        <SupportCard theme={theme} icon="headphones" tone="accent" label={t('settings.contactUs')} onPress={() => router.push('/(app)/support')} />
        <SupportCard theme={theme} icon="help-circle" tone="primary" label={t('settings.faq')} onPress={() => router.push('/(app)/support')} />
        <Pressable onPress={() => router.push('/(app)/lost-found')} style={({ pressed }) => [s.lostCard, pressed && { opacity: 0.92 }]}>
          <View style={s.lostBlob} pointerEvents="none" />
          <View style={s.lostIcon}>
            <Icon name="search" size={26} color={theme.colors.accentBright} />
          </View>
          <Text style={s.lostTitle}>{t('settings.reportLost')}</Text>
          <Text style={s.lostSub}>{t('settings.aiPowered')}</Text>
        </Pressable>

        {/* Legal */}
        <View style={s.legalSection}>
          <Text style={s.legalHeading}>{t('settings.legal')}</Text>
          <LegalRow theme={theme} label={t('settings.privacy')} onPress={() => router.push('/(app)/support')} />
          <LegalRow theme={theme} label={t('settings.terms')} onPress={() => router.push('/(app)/support')} />
        </View>

        {/* Logout — centered pill */}
        <View style={s.logoutWrap}>
          <Pressable style={({ pressed }) => [s.logoutBtn, pressed && { backgroundColor: theme.colors.dangerSoft }]} onPress={logout}>
            <Icon name="log-out" size={20} color={theme.colors.danger} />
            <Text style={s.logout}>{t('auth.logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Horizontal setting row (icon circle · text · chevron), error variant for emergency. */
function GeneralRow({
  theme,
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  theme: AppTheme;
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, danger && s.rowDanger, pressed && { opacity: 0.8 }]}>
      <View style={s.rowLeft}>
        <View style={[s.rowIcon, danger && s.rowIconDanger]}>
          <Icon name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.rowTitle, danger && s.rowTitleDanger]}>{title}</Text>
          {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
        </View>
      </View>
      <Icon name="chevron-left" size={22} color={danger ? theme.colors.danger : theme.colors.border} />
    </Pressable>
  );
}

/** Vertical support tile (icon circle on top, label below). */
function SupportCard({ theme, icon, label, tone, onPress }: { theme: AppTheme; icon: IconName; label: string; tone: 'accent' | 'primary'; onPress: () => void }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.supportCard, pressed && { opacity: 0.85 }]}>
      <View style={[s.supportIcon, tone === 'accent' ? s.supportIconAccent : s.supportIconPrimary]}>
        <Icon name={icon} size={28} color={tone === 'accent' ? theme.colors.accent : theme.colors.primary} />
      </View>
      <Text style={s.supportLabel}>{label}</Text>
    </Pressable>
  );
}

/** Legal link row — text on the right, external-link glyph on the left. */
function LegalRow({ theme, label, onPress }: { theme: AppTheme; label: string; onPress: () => void }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.legalRow, pressed && { backgroundColor: theme.colors.surfaceAlt }]}>
      <Text style={s.legalText}>{label}</Text>
      <Icon name="external-link" size={16} color={theme.colors.border} />
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, backgroundColor: t.colors.surface, ...t.shadow.sm },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 32, lineHeight: 40, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    section: { fontFamily: t.fontFamily.semibold, fontSize: 24, lineHeight: 32, color: t.colors.primary, textAlign: 'right', marginBottom: t.spacing.md },

    // General rows
    row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.lg, marginBottom: t.spacing.md, ...t.shadow.sm },
    rowDanger: { backgroundColor: t.colors.dangerSoft, borderColor: t.colors.dangerSoft },
    rowLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, flex: 1 },
    rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    rowIconDanger: { backgroundColor: t.colors.dangerSoft },
    rowTitle: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    rowTitleDanger: { fontFamily: t.fontFamily.bold, color: t.colors.danger },
    rowSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },

    // Support cards
    supportCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, minHeight: 128, alignItems: 'center', justifyContent: 'center', gap: t.spacing.sm, marginBottom: t.spacing.md, ...t.shadow.sm },
    supportIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    supportIconAccent: { backgroundColor: t.colors.accentSoft },
    supportIconPrimary: { backgroundColor: t.colors.surfaceHighest },
    supportLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text },

    // Lost & found (AI) — navy gradient-approx card with decorative blob
    lostCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.primaryContainer, minHeight: 128, alignItems: 'center', justifyContent: 'center', gap: t.spacing.sm, marginBottom: t.spacing.md, overflow: 'hidden', ...t.shadow.md },
    lostBlob: { position: 'absolute', top: -16, right: -16, width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.accent, opacity: 0.2 },
    lostIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    lostTitle: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.onPrimary },
    lostSub: { fontFamily: t.fontFamily.regular, fontSize: 10, color: t.colors.onPrimaryMuted },

    // Legal
    legalSection: { marginTop: t.spacing.lg, paddingTop: t.spacing.base, borderTopWidth: 1, borderTopColor: t.colors.border },
    legalHeading: { fontFamily: t.fontFamily.regular, fontSize: 18, lineHeight: 28, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.sm },
    legalRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 8, borderRadius: t.radius.md },
    legalText: { fontFamily: t.fontFamily.regular, fontSize: 16, color: t.colors.text },

    // Logout
    logoutWrap: { alignItems: 'center', paddingTop: t.spacing.xl, paddingBottom: t.spacing.base },
    logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: t.spacing.xl, paddingVertical: 12, borderRadius: 9999 },
    logout: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.danger },
  });
