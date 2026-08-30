import { useMemo } from 'react';
import type { LegalDocument } from '@rafeeq/shared';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  getLegalUrl,
  Icon,
  ListRow,
  Text,
  useConfirm,
  useTheme,
  useToast,
  type AppTheme,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';

/* ═══════════════════════════════════════════════════════════════════════════
   حسابي — one account screen, per design screen 32.

   ── What this replaced ─────────────────────────────────────────────────────

   `profile.tsx` (193 lines) and `settings.tsx` (217) were two tabs about the same
   two objects, and each linked to the other's rows: documents and the vehicle were
   reachable from both, so the captain had two different-looking doors to the same
   place and no way to tell them apart. Five visible tabs for a nine-screen app.

   Kept from `profile.tsx`, because nothing else in the app shows them: the rating
   and total-trip figures, and the identity block.

   Kept from `settings.tsx`, because the app is unsubmittable without them: the
   privacy and terms links, and the account-deletion path.

   ── The bell now opens something ───────────────────────────────────────────

   Both old headers had an inert bell. There is an inbox now, so «الإشعارات» is a
   row in this screen's list rather than an icon that used to lie.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Open a legal document in the system browser.
 *
 * These buttons once navigated to the support screen instead, so the app offered
 * documents it never showed. Both stores require a reachable privacy policy.
 */
const openLegal = (doc: LegalDocument) => {
  Linking.openURL(getLegalUrl(doc)).catch(() => undefined);
};

export default function Account() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const confirm = useConfirm();

  const user = useAuth((a) => a.user);
  const driver = useAuth((a) => a.driver);
  const logout = useAuth((a) => a.logout);
  const prefsLocale = usePrefs((p) => p.locale);
  const setLocale = usePrefs((p) => p.setLocale);

  const initial = (user?.full_name ?? 'ر').charAt(0);
  const vehicle = driver?.vehicles?.[0];
  const docsApproved = (driver?.documents ?? []).filter((d) => d.status === 'approved').length;
  const docsTotal = driver?.documents?.length ?? 0;

  const ask = (key: 'logout' | 'delete') => {
    const isDelete = key === 'delete';

    return confirm({
      title: t(isDelete ? 'settings.deleteConfirmTitle' : 'settings.logoutConfirmTitle'),
      message: t(isDelete ? 'settings.deleteConfirmMsg' : 'settings.logoutConfirmMsg'),
      confirmLabel: t(isDelete ? 'settings.deleteConfirm' : 'auth.logout'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
  };

  const signOut = async () => {
    if (await ask('logout')) await logout();
  };

  /*
   * Account deletion.
   *
   * `DELETE /api/v1/profile` has been live since the Users module existed, wired to
   * `AccountErasureService`, and neither app had a way to reach it. Both stores
   * require an in-app deletion path from any app that lets a user create an account,
   * so this was a submission blocker sitting behind a working endpoint.
   *
   * For a captain, erasure additionally clears the document artifacts while KEEPING
   * the payout ledger, because completed trips are money that moved.
   */
  const eraseAccount = async () => {
    if (!(await ask('delete'))) return;
    try {
      await api.profile.deleteAccount();
      toast.success(t('settings.deleted'));
      await logout();
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('settings.deleteFailed'));
    }
  };

  const chevron = <Icon name="chevron-left" size={20} color={theme.colors.muted} />;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text role="display" tone="primary">{t('settings.account')}</Text>

        {/* Identity — the block that was the whole top of profile.tsx */}
        <View style={s.hero}>
          <View style={s.heroBlob} pointerEvents="none" />
          <View style={s.avatar}>
            <Text role="displayMd" tone="inverse" align="center">{initial}</Text>
            {driver?.status === 'approved' ? (
              <View style={s.verifiedBadge}>
                <Icon name="check" size={12} color={theme.colors.onAccent} />
              </View>
            ) : null}
          </View>
          <View style={s.heroText}>
            <Text role="titleLg" tone="primary" numberOfLines={1}>{user?.full_name ?? '—'}</Text>
            <Text role="body" tone="secondary">{user?.phone ?? '—'}</Text>
          </View>
        </View>

        {/* The two figures nothing else in the app shows. */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={s.statHead}>
              <Icon name="star" size={16} color={theme.colors.accent} />
              <Text role="label" tone="secondary">{t('driver.overallRating')}</Text>
            </View>
            <Text role="titleLg" tone="primary">{driver?.rating_avg?.toFixed(1) ?? '—'}</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statHead}>
              <Icon name="navigation" size={16} color={theme.colors.primary} />
              <Text role="label" tone="secondary">{t('driver.totalTrips')}</Text>
            </View>
            <Text role="titleLg" tone="primary">{driver?.total_trips?.toLocaleString(locale) ?? '0'}</Text>
          </View>
        </View>

        {/* Account rows */}
        <Text role="titleSm" tone="secondary" style={s.section}>{t('settings.account')}</Text>
        <View style={s.group}>
          <ListRow
            icon="truck"
            title={t('driver.vehicleAndDocs')}
            subtitle={vehicle ? `${vehicle.make} ${vehicle.model}` : t('driver.noVehicle')}
            trailing={
              <View style={s.trailing}>
                {docsTotal > 0 ? (
                  <Text role="label" tone={docsApproved === docsTotal ? 'success' : 'warning'}>
                    {docsApproved}/{docsTotal}
                  </Text>
                ) : null}
                {chevron}
              </View>
            }
            onPress={() => router.push('/(app)/vehicle-docs')}
          />
          {/*
            The bell used to be here as chrome. It is a row now, because there is
            finally a screen behind it — see (app)/notifications.tsx.
          */}
          <ListRow icon="bell" title={t('notifications.title')} trailing={chevron} onPress={() => router.push('/(app)/notifications')} />
          <ListRow
            icon="globe"
            title={t('settings.appLanguage')}
            subtitle={prefsLocale === 'ar' ? t('settings.arabic') : t('settings.english')}
            trailing={chevron}
            onPress={() => void setLocale(prefsLocale === 'ar' ? 'en' : 'ar')}
          />
        </View>

        {/* Support */}
        <View style={s.supportCard}>
          <View style={s.supportBlob} pointerEvents="none" />
          <View style={s.supportIcon}>
            <Icon name="headphones" size={26} color={theme.colors.accentBright} />
          </View>
          <Text role="titleLg" tone="inverse">{t('settings.supportCenter')}</Text>
          <Text role="body" style={s.supportDesc}>{t('settings.supportDesc')}</Text>
          <Pressable
            onPress={() => router.push('/(app)/chat')}
            accessibilityRole="button"
            style={({ pressed }) => [s.supportBtn, pressed && s.pressed]}
          >
            <Icon name="message-circle" size={18} color={theme.colors.onAccent} />
            <Text role="titleSm" align="center" style={s.supportBtnText}>{t('settings.chatWithUs')}</Text>
          </Pressable>
          <View style={s.supportMeta}>
            <Icon name="clock" size={16} color={theme.colors.onPrimaryMuted} />
            <Text role="label" style={s.supportMetaText}>{t('settings.avgResponse')}</Text>
          </View>
        </View>

        {/* Legal — both stores require these to be reachable from inside the app. */}
        <Text role="titleSm" tone="secondary" style={s.section}>{t('settings.legal')}</Text>
        <View style={s.group}>
          <ListRow icon="shield" title={t('settings.privacy')} trailing={chevron} onPress={() => openLegal('privacy')} />
          <ListRow icon="file-text" title={t('settings.terms')} trailing={chevron} onPress={() => openLegal('terms')} />
        </View>

        {/* The two ways out, both behind a confirmation. */}
        <View style={s.exitWrap}>
          <Pressable
            onPress={() => void signOut()}
            accessibilityRole="button"
            accessibilityLabel={t('auth.logout')}
            style={({ pressed }) => [s.exitBtn, pressed && s.pressed]}
          >
            <Icon name="log-out" size={18} color={theme.colors.danger} />
            <Text role="body" tone="danger">{t('auth.logout')}</Text>
          </Pressable>
          <Pressable
            onPress={() => void eraseAccount()}
            accessibilityRole="button"
            accessibilityLabel={t('settings.deleteAccount')}
            style={({ pressed }) => [s.exitBtn, pressed && s.pressed]}
          >
            <Icon name="trash-2" size={18} color={theme.colors.danger} />
            <Text role="body" tone="danger">{t('settings.deleteAccount')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    hero: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.lg, backgroundColor: t.colors.surface, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.surfaceHighest, padding: t.spacing.lg, marginTop: t.spacing.base, overflow: 'hidden', ...t.shadow.sm },
    heroBlob: { position: 'absolute', top: -40, right: -40, width: 128, height: 128, borderRadius: 64, backgroundColor: t.colors.accentBright, opacity: 0.1 },
    heroText: { flex: 1, gap: 2 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface, ...t.shadow.md },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface },

    statsRow: { flexDirection: 'row-reverse', gap: t.spacing.md, marginTop: t.spacing.md },
    statCard: { flex: 1, backgroundColor: t.colors.surface, borderRadius: t.radius.card, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, gap: 6, ...t.shadow.sm },
    statHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },

    section: { marginTop: t.spacing.lg, marginBottom: t.spacing.sm },
    group: { backgroundColor: t.colors.surface, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden', ...t.shadow.sm },
    trailing: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm },

    supportCard: { backgroundColor: t.colors.primary, borderRadius: t.radius.sheet, padding: t.spacing.lg, marginTop: t.spacing.lg, overflow: 'hidden', ...t.shadow.md },
    supportBlob: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: t.colors.accent, opacity: 0.2 },
    supportIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.md },
    supportDesc: { color: t.colors.onPrimaryMuted, marginTop: 6, marginBottom: t.spacing.lg },
    supportBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.accent, borderRadius: t.radius.control, paddingVertical: 12 },
    supportBtnText: { color: t.colors.onAccent },
    supportMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: t.spacing.base, paddingTop: t.spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
    supportMetaText: { color: t.colors.onPrimaryMuted },

    exitWrap: { alignItems: 'center', paddingTop: t.spacing.xl, gap: t.spacing.sm },
    exitBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: t.spacing.xl, paddingVertical: 12, borderRadius: t.radius.pill, backgroundColor: t.colors.dangerSoft },
    pressed: { opacity: 0.9 },
  });
