import { useMemo, useState } from 'react';
import { LEGAL_URLS, LegalDocument } from '@rafeeq/shared';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Icon, Text, useConfirm, useTheme, useToast, type AppTheme, type IconName } from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';
import { api } from '../../src/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   حسابي — settings, support, legal, and the two ways out.

   ── What was removed ───────────────────────────────────────────────────────

   The «الإبلاغ عن مفقودات» card, a navy tile pushing `/(app)/lost-found`. Phase 8
   deleted lost-and-found end to end (module, AI tools, screen, api-client), so
   this was a button that navigated to nothing — expo-router would have rendered
   its not-found screen inside the tab.

   ── What was added, because a store will reject a build without it ─────────

   Account deletion. `DELETE /api/v1/profile` has been live since the Users module
   existed, wired to `AccountErasureService`, and NEITHER app had a client method or
   a row for it. Both app stores require an in-app deletion path for any app that
   lets a user create an account, so this was a submission blocker sitting behind a
   working endpoint.

   The wording matters as much as the button: erasure anonymises the identifying
   columns and KEEPS the ledger, because a deleted student's completed trips are
   still the captain's earnings and the company's tax record. The dialog says so
   rather than promising a clean disappearance we cannot deliver.

   ── Sign-out now asks ──────────────────────────────────────────────────────

   `onPress={logout}` on a pill directly under a scroll region, with the primary
   route back in being an SMS code. One accidental tap cost a student their session
   and a round trip through the OTP flow.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Open a legal document in the system browser.
 *
 * These buttons previously navigated to the support screen (student) and the chat
 * screen (captain), so the app offered documents it never showed. Both stores require
 * a reachable privacy policy from inside the app.
 */
const openLegal = (doc: LegalDocument) => {
  Linking.openURL(LEGAL_URLS[doc]).catch(() => undefined);
};

export default function Settings() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const logout = useAuth((a) => a.logout);
  const locale = usePrefs((p) => p.locale);
  const setLocale = usePrefs((p) => p.setLocale);
  const [erasing, setErasing] = useState(false);

  const initial = (user?.full_name ?? 'ر').charAt(0);

  const signOut = async () => {
    const ok = await confirm({
      title: t('settings.logoutConfirmTitle'),
      message: t('settings.logoutConfirmMsg'),
      confirmLabel: t('auth.logout'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (ok) await logout();
  };

  const eraseAccount = async () => {
    const ok = await confirm({
      title: t('settings.deleteConfirmTitle'),
      message: t('settings.deleteConfirmMsg'),
      confirmLabel: t('settings.deleteConfirm'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!ok) return;

    setErasing(true);
    try {
      await api.profile.deleteAccount();
      toast.success(t('settings.deleted'));
      /* The token no longer points at a usable identity, so the session must go
         even though the request succeeded. */
      await logout();
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('settings.deleteFailed'));
    } finally {
      setErasing(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text role="titleMd" tone="primary">{initial}</Text>
        </View>
        <Text role="displayMd" tone="primary">{t('common.appName')}</Text>
        <Pressable
          onPress={() => router.push('/(app)/notifications')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.notifications')}
          hitSlop={8}
          style={s.headerBtn}
        >
          <Icon name="bell" size={24} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text role="display" tone="primary" style={s.section}>{t('settings.general')}</Text>
        <SettingRow
          theme={theme}
          icon="globe"
          title={t('settings.appLanguage')}
          subtitle={locale === 'ar' ? t('settings.arabic') : t('settings.english')}
          onPress={() => void setLocale(locale === 'ar' ? 'en' : 'ar')}
        />
        <SettingRow
          theme={theme}
          icon="bell"
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsDesc')}
          onPress={() => router.push('/(app)/notifications')}
        />
        {/*
          Saved addresses. This screen existed, worked, and had no way in — it was
          registered in the tab layout with `href: null` and nothing anywhere
          navigated to it. The backend behind it is fully live, and phase 3 even
          encrypted its `address_text` column at rest. So it was a finished feature
          nobody could reach, which is a routing bug rather than dead code, and
          deleting it would have thrown away working work.
        */}
        <SettingRow
          theme={theme}
          icon="map-pin"
          title={t('addresses.title')}
          subtitle={t('addresses.subtitle')}
          onPress={() => router.push('/(app)/addresses')}
        />
        <SettingRow
          theme={theme}
          icon="credit-card"
          title={t('subscriptions.title')}
          subtitle={t('subscriptions.subtitle')}
          onPress={() => router.push('/(app)/subscriptions')}
        />
        <SettingRow
          theme={theme}
          icon="triangle-alert"
          title={t('settings.emergencyContact')}
          subtitle={t('settings.emergencyDesc')}
          onPress={() => router.push('/(app)/emergency')}
          danger
        />

        <Text role="display" tone="primary" style={s.sectionSpaced}>{t('settings.supportCenter')}</Text>
        <SettingRow
          theme={theme}
          icon="headphones"
          title={t('settings.contactUs')}
          subtitle={t('settings.avgResponse')}
          onPress={() => router.push('/(app)/support')}
        />
        <SettingRow
          theme={theme}
          icon="circle-question-mark"
          title={t('settings.faq')}
          onPress={() => router.push('/(app)/support')}
        />

        <View style={s.legalSection}>
          <Text role="bodyLg" tone="secondary" style={s.legalHeading}>{t('settings.legal')}</Text>
          <LegalRow theme={theme} label={t('settings.privacy')} onPress={() => openLegal('privacy')} />
          <LegalRow theme={theme} label={t('settings.terms')} onPress={() => openLegal('terms')} />
        </View>

        <View style={s.exits}>
          <Pressable
            onPress={() => void signOut()}
            accessibilityRole="button"
            accessibilityLabel={t('auth.logout')}
            style={({ pressed }) => [s.exitBtn, pressed && s.pressedDanger]}
          >
            <Icon name="log-out" size={20} color={theme.colors.danger} />
            <Text role="titleSm" tone="danger">{t('auth.logout')}</Text>
          </Pressable>

          <Pressable
            onPress={() => void eraseAccount()}
            disabled={erasing}
            accessibilityRole="button"
            accessibilityLabel={t('settings.deleteAccount')}
            accessibilityState={{ disabled: erasing, busy: erasing }}
            style={({ pressed }) => [s.exitBtn, pressed && s.pressedDanger, erasing && s.disabled]}
          >
            <Icon name="trash-2" size={20} color={theme.colors.danger} />
            <Text role="titleSm" tone="danger">{t('settings.deleteAccount')}</Text>
          </Pressable>
          <Text role="caption" tone="muted" align="center">{t('settings.deleteAccountDesc')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Horizontal setting row (icon circle · text · chevron), danger variant for safety. */
function SettingRow({
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [s.row, danger && s.rowDanger, pressed && s.pressed]}
    >
      <View style={s.rowLeft}>
        <View style={[s.rowIcon, danger && s.rowIconDanger]}>
          <Icon name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.primary} />
        </View>
        <View style={s.flex}>
          <Text role="titleSm" tone={danger ? 'danger' : 'default'}>{title}</Text>
          {subtitle ? <Text role="caption" tone="secondary">{subtitle}</Text> : null}
        </View>
      </View>
      <Icon name="chevron-left" size={22} color={danger ? theme.colors.danger : theme.colors.border} />
    </Pressable>
  );
}

/** Legal link row — text on the right, external-link glyph on the left. */
function LegalRow({ theme, label, onPress }: { theme: AppTheme; label: string; onPress: () => void }) {
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [s.legalRow, pressed && s.pressedSurface]}
    >
      <Text role="bodyLg">{label}</Text>
      <Icon name="external-link" size={16} color={theme.colors.border} />
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    flex: { flex: 1 },
    pressed: { opacity: 0.8 },
    pressedDanger: { backgroundColor: t.colors.dangerSoft },
    pressedSurface: { backgroundColor: t.colors.surfaceAlt },
    disabled: { opacity: 0.6 },
    header: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, backgroundColor: t.colors.surface, ...t.shadow.sm,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    avatar: {
      width: 40, height: 40, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceHighest,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border,
    },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    section: { marginBottom: t.spacing.md },
    sectionSpaced: { marginTop: t.spacing.xl, marginBottom: t.spacing.md },

    row: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.colors.surface, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.border,
      padding: t.spacing.lg, marginBottom: t.spacing.md, ...t.shadow.sm,
    },
    rowDanger: { backgroundColor: t.colors.dangerSoft, borderColor: t.colors.dangerSoft },
    rowLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, flex: 1 },
    rowIcon: { width: 40, height: 40, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    rowIconDanger: { backgroundColor: t.colors.dangerSoft },

    legalSection: { marginTop: t.spacing.lg, paddingTop: t.spacing.base, borderTopWidth: 1, borderTopColor: t.colors.border },
    legalHeading: { marginBottom: t.spacing.sm },
    legalRow: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: 8, borderRadius: t.radius.control,
    },

    exits: { alignItems: 'center', gap: t.spacing.sm, paddingTop: t.spacing.xl, paddingBottom: t.spacing.base },
    exitBtn: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
      paddingHorizontal: t.spacing.xl, paddingVertical: 12, borderRadius: t.radius.pill,
    },
  });
