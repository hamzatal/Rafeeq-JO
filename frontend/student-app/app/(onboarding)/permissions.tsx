import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useI18n } from '../../src/i18n';
import { usePrefs } from '../../src/store/prefs';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';
import {
  getLocationState,
  getNotificationState,
  requestLocation,
  requestNotifications,
} from '../../src/lib/permissions';

type Status = 'idle' | 'granted';

export default function Permissions() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const setIntroSeen = usePrefs((st) => st.setIntroSeen);

  const [location, setLocation] = useState<Status>('idle');
  const [notifications, setNotifications] = useState<Status>('idle');

  // Reflect any permission the OS already granted.
  useEffect(() => {
    void getLocationState().then((st) => st === 'granted' && setLocation('granted'));
    void getNotificationState().then((st) => st === 'granted' && setNotifications('granted'));
  }, []);

  const askLocation = async () => {
    const ok = await requestLocation();
    if (ok) setLocation('granted');
  };
  const askNotifications = async () => {
    const ok = await requestNotifications();
    if (ok) setNotifications('granted');
  };

  const finish = async () => {
    await setIntroSeen();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.title}>{t('permissions.title')}</Text>
          <Text style={s.subtitle}>{t('permissions.subtitle')}</Text>
        </View>

        <View style={s.cards}>
          <PermRow
            s={s}
            theme={theme}
            icon="map-pin"
            title={t('permissions.locationTitle')}
            body={t('permissions.locationBody')}
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
            body={t('permissions.notificationsBody')}
            granted={notifications === 'granted'}
            allowLabel={t('permissions.allow')}
            enabledLabel={t('permissions.enabled')}
            onAllow={askNotifications}
          />
        </View>

        <View style={s.footer}>
          <Pressable onPress={finish} style={({ pressed }) => [s.cta, pressed && s.pressed]}>
            <Text style={s.ctaText}>{t('permissions.continue')}</Text>
          </Pressable>
          <Pressable onPress={finish} hitSlop={10} style={s.laterBtn}>
            <Text style={s.later}>{t('permissions.later')}</Text>
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
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.cardBody}>{body}</Text>
      </View>
      {granted ? (
        <View style={s.granted}>
          <Icon name="check" size={16} color={theme.colors.success} />
          <Text style={s.grantedText}>{enabledLabel}</Text>
        </View>
      ) : (
        <Pressable onPress={onAllow} style={({ pressed }) => [s.allow, pressed && s.pressed]}>
          <Text style={s.allowText}>{allowLabel}</Text>
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
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'right', marginTop: 8 },

    cards: { flex: 1, gap: t.spacing.base },
    card: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, gap: t.spacing.md, ...t.shadow.sm },
    cardIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    cardText: { flex: 1 },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    cardBody: { fontFamily: t.fontFamily.regular, fontSize: 13, lineHeight: 20, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    allow: { backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingHorizontal: t.spacing.base, paddingVertical: 10 },
    allowText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.onPrimary },
    granted: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: t.colors.successSoft, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 9 },
    grantedText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.success },

    footer: { paddingBottom: t.spacing.lg, gap: t.spacing.sm },
    cta: { backgroundColor: t.colors.primary, height: 54, borderRadius: t.radius.lg, alignItems: 'center', justifyContent: 'center' },
    ctaText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.onPrimary },
    laterBtn: { alignItems: 'center', paddingVertical: 8 },
    later: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.textSecondary },
    pressed: { opacity: 0.88 },
  });
