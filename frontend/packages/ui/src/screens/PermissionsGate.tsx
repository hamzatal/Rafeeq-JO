/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION PRIMING — one copy.

   169 and 168 lines, and **two** lines of real difference: which body copy each
   permission row shows. A student is told location finds their pickup point; a
   captain is told it puts nearby requests in front of them. Two translation keys.

   Everything else — the OS-state reflection on mount, the two request handlers, the
   `PermRow` component, the granted pill, 30 lines of styles — existed twice so that
   two strings could differ.

   ── Why `audience` and not two body props ──────────────────────────────────

   Passing `locationBody` and `notificationsBody` as strings would let a caller pass
   anything, including nothing, and the screen would render an empty card. The
   audience is the actual variable — there are exactly two apps — and naming it that
   way means the copy for each lives in the dictionary next to its twin, where a
   translator can see both.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon, type IconName } from '../components/Icon';
import { Text } from '../components/Text';
import { useI18n } from '../runtime/i18n';
import { getLocationState, getNotificationState, requestLocation, requestNotifications } from '../runtime/permissions';
import { useTheme, type AppTheme } from '../theme';

export interface PermissionsGateProps {
  /** Which app is asking. Decides the body copy on each row, nothing else. */
  audience: 'student' | 'driver';
  /** Continue and Later both land here: skipping is a valid answer, not a dead end. */
  onDone: () => void;
}

type Status = 'idle' | 'granted';

export function PermissionsGate({ audience, onDone }: PermissionsGateProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [location, setLocation] = useState<Status>('idle');
  const [notifications, setNotifications] = useState<Status>('idle');

  // Reflect any permission the OS already granted.
  useEffect(() => {
    void getLocationState().then((st) => st === 'granted' && setLocation('granted'));
    void getNotificationState().then((st) => st === 'granted' && setNotifications('granted'));
  }, []);

  const askLocation = async () => {
    if (await requestLocation()) setLocation('granted');
  };
  const askNotifications = async () => {
    if (await requestNotifications()) setNotifications('granted');
  };

  /*
   * A table of LITERAL keys, not `t(`permissions.locationBody${suffix}`)`.
   *
   * The computed form worked and cost detectability: the `dead-translation-key` gate
   * immediately reported all four of these as unread, because a key assembled at
   * runtime cannot be found by reading source. The alternative was adding
   * `permissions.locationBody` to the dynamic allow-list — permanently giving up the
   * ability to notice when one of them really does die.
   *
   * Writing them out keeps `audience` as the only prop AND keeps every key greppable.
   * That is the general shape of the fix whenever that gate fires on new code: the
   * key should be a constant somewhere, not a concatenation.
   */
  const copy = audience === 'driver'
    ? { location: 'permissions.locationBodyDriver', notifications: 'permissions.notificationsBodyDriver' }
    : { location: 'permissions.locationBody', notifications: 'permissions.notificationsBody' };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text role="display">{t('permissions.title')}</Text>
          <Text role="titleSm" tone="secondary" style={s.subtitle}>{t('permissions.subtitle')}</Text>
        </View>

        <View style={s.cards}>
          <PermRow
            s={s}
            theme={theme}
            icon="map-pin"
            title={t('permissions.locationTitle')}
            body={t(copy.location)}
            granted={location === 'granted'}
            allowLabel={t('permissions.allow')}
            enabledLabel={t('permissions.enabled')}
            onAllow={askLocation}
          />
          <PermRow
            s={s}
            theme={theme}
            icon="bell"
            title={t('permissions.notificationsTitle')}
            body={t(copy.notifications)}
            granted={notifications === 'granted'}
            allowLabel={t('permissions.allow')}
            enabledLabel={t('permissions.enabled')}
            onAllow={askNotifications}
          />
        </View>

        <View style={s.footer}>
          <Pressable onPress={onDone} accessibilityRole="button" style={({ pressed }) => [s.cta, pressed && s.pressed]}>
            <Text role="titleMd" tone="inverse" align="center">{t('permissions.continue')}</Text>
          </Pressable>
          <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button" style={s.laterBtn}>
            <Text role="body" tone="secondary" style={s.later}>{t('permissions.later')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function PermRow({
  s,
  theme,
  icon,
  title,
  body,
  granted,
  allowLabel,
  enabledLabel,
  onAllow,
}: {
  s: ReturnType<typeof makeStyles>;
  theme: AppTheme;
  icon: IconName;
  title: string;
  body: string;
  granted: boolean;
  allowLabel: string;
  enabledLabel: string;
  onAllow: () => void;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardIcon}>
        <Icon name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={s.cardText}>
        <Text role="titleSm" style={s.cardTitle}>{title}</Text>
        <Text role="body" tone="secondary" style={s.cardBody}>{body}</Text>
      </View>
      {granted ? (
        <View style={s.granted}>
          <Icon name="check" size={16} color={theme.colors.success} />
          <Text role="label" tone="success" style={s.strong}>{enabledLabel}</Text>
        </View>
      ) : (
        <Pressable onPress={onAllow} accessibilityRole="button" style={({ pressed }) => [s.allow, pressed && s.pressed]}>
          <Text role="label" tone="inverse" align="center" style={s.strong}>{allowLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    header: { paddingTop: t.spacing.xl, marginBottom: t.spacing.xl },
    subtitle: { marginTop: 8 },

    cards: { flex: 1, gap: t.spacing.base },
    card: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, gap: t.spacing.md, ...t.shadow.sm },
    cardIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    cardText: { flex: 1 },
    cardTitle: { fontFamily: t.fontFamily.bold },
    cardBody: { marginTop: 2 },
    allow: { backgroundColor: t.colors.primary, borderRadius: t.radius.control, paddingHorizontal: t.spacing.base, paddingVertical: 10 },
    granted: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: t.colors.successSoft, borderRadius: t.radius.control, paddingHorizontal: 12, paddingVertical: 9 },
    strong: { fontFamily: t.fontFamily.bold },

    footer: { paddingBottom: t.spacing.lg, gap: t.spacing.sm },
    cta: { backgroundColor: t.colors.primary, height: 54, borderRadius: t.radius.card, alignItems: 'center', justifyContent: 'center' },
    laterBtn: { alignItems: 'center', paddingVertical: 8 },
    later: { fontFamily: t.fontFamily.semibold },
    pressed: { opacity: 0.88 },
  });
