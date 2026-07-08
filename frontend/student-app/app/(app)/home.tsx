import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { RewardSummary } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { getCurrentLocation, watchLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon } from '../../src/components/Icon';
import { LiveMap, type MapPoint } from '../../src/components/LiveMap';
import { PressableScale } from '../../src/components/kit';
import { AdBanner } from '../../src/components/AdBanner';
import { SmartSuggestions } from '../../src/components/SmartSuggestions';

function greetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'goodMorning';
  if (h < 18) return 'goodAfternoon';
  return 'goodEvening';
}

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth((st) => st.user);
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [unread, setUnread] = useState(0);
  const [rewards, setRewards] = useState<RewardSummary | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Bottom action-area entrance + ambient car-marker pulse.
  const rise = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [rise, pulse]);

  useEffect(() => {
    api.notifications.unreadCount().then(setUnread).catch(() => undefined);
    api.rewards.summary().then(setRewards).catch(() => undefined);
    void getCurrentLocation().then((loc) => loc && setMyLoc(loc));
    const stop = watchLocation((loc) => setMyLoc(loc));
    return stop;
  }, []);

  const recenter = async () => {
    const loc = await getCurrentLocation();
    if (loc) setMyLoc({ ...loc });
  };

  const mapPoints: MapPoint[] = myLoc ? [{ lat: myLoc.lat, lng: myLoc.lng, kind: 'origin', label: t('home.nearby') }] : [];
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : '';
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [56, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={s.root}>
      {/* Full-bleed map — the app IS the map */}
      <View style={StyleSheet.absoluteFill}>
        <LiveMap points={mapPoints} legend={false} height={height} />
      </View>

      {/* Ambient bottom scrim so the action area reads clearly over the map.
          Layered plain views (no gradient dependency) for a soft fade. */}
      <View style={[s.scrim, s.scrimA]} pointerEvents="none" />
      <View style={[s.scrim, s.scrimB]} pointerEvents="none" />

      {/* Decorative nearby-captain marker (ambient) */}
      <View style={s.carMarker} pointerEvents="none">
        <View>
          <Animated.View style={[s.carPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
          <View style={s.carDisc}>
            <MaterialIcons name="directions-car" size={28} color={theme.colors.primary} />
          </View>
        </View>
        <View style={s.etaBadge}>
          <Text style={s.etaText}>٣ دقائق</Text>
        </View>
      </View>

      {/* Top bar: greeting glass pill (right) + notifications (left) */}
      <SafeAreaView edges={['top']} style={s.topBar} pointerEvents="box-none">
        <View style={s.greetPill}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>{(firstName || 'ر').charAt(0)}</Text>
          </View>
          <View>
            <Text style={s.greetName} numberOfLines={1}>
              {t('home.hello').replace(' 👋', '')}{firstName ? `، ${firstName}` : ''}
            </Text>
            <Text style={s.greetSub}>{t(`home.${greetingKey()}`)}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/(app)/notifications')} style={s.bellBtn} hitSlop={6}>
          <Icon name="bell" size={20} color={theme.colors.primary} />
          {unread > 0 && <View style={s.bellDot} />}
        </Pressable>
      </SafeAreaView>

      {/* Recenter to my real location */}
      <Pressable onPress={recenter} style={s.locateFab} hitSlop={8}>
        <Icon name="crosshair" size={20} color={theme.colors.accent} />
      </Pressable>

      {/* Bottom action area */}
      <Animated.View style={[s.bottomArea, { opacity: rise, transform: [{ translateY }] }]}>
        {/* Points & status card (navy gradient) */}
        <PressableScale onPress={() => router.push('/(app)/rewards')} style={s.pointsWrap}>
          <View style={s.pointsCard}>
            <View style={s.pointsDecor} />
            <View style={s.pointsDecor2} />
            <View style={s.pointsLeft}>
              <View style={s.pointsIcon}>
                <Icon name="award" size={20} color={theme.colors.accent} />
              </View>
              <View>
                <Text style={s.pointsLabel}>{t('home.points')}</Text>
                <Text style={s.pointsValue}>{rewards ? rewards.points.toLocaleString('en-US') : '—'}</Text>
              </View>
            </View>
            <View style={s.pointsRight}>
              <Text style={s.pointsLabel}>{t('home.level')}</Text>
              <Text style={s.pointsTier}>{rewards?.tier_label ?? '—'}</Text>
            </View>
          </View>
        </PressableScale>

        {/* AI-powered context-aware ride suggestions */}
        <SmartSuggestions />

        {/* Sponsored ad slot (managed from the admin dashboard) */}
        <AdBanner placement="student_home" />

        {/* Where to? glass panel */}
        <View style={s.panel}>
          <Text style={s.panelTitle}>{t('home.whereTo')}</Text>
          <PressableScale onPress={() => router.push('/(app)/ride-request')} style={s.searchBtn} scaleTo={0.98}>
            <Icon name="search" size={20} color={theme.colors.accent} />
            <Text style={s.searchText}>{t('home.searchDestination')}</Text>
          </PressableScale>
          <View style={s.quickRow}>
            <QuickAction theme={theme} icon="home" label={t('home.labelHome')} onPress={() => router.push('/(app)/ride-request')} />
            <QuickAction theme={theme} icon="book-open" label={t('home.labelUniversity')} onPress={() => router.push('/(app)/ride-request')} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function QuickAction({ theme, icon, label, onPress }: { theme: AppTheme; icon: 'home' | 'book-open'; label: string; onPress: () => void }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <PressableScale onPress={onPress} style={s.quickTile} scaleTo={0.95}>
      <View style={s.quickIcon}>
        <Icon name={icon} size={22} color={theme.colors.primary} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </PressableScale>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    scrimA: { height: '42%', backgroundColor: 'rgba(249,249,255,0.35)' },
    scrimB: { height: '22%', backgroundColor: 'rgba(249,249,255,0.55)' },

    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.sm },
    greetPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingRight: 8, paddingLeft: 16, paddingVertical: 8, borderRadius: t.radius.full, ...t.shadow.sm },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.onPrimary },
    greetName: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.primary, textAlign: 'right' },
    greetSub: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.textSecondary, textAlign: 'right' },
    bellBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    bellDot: { position: 'absolute', top: 12, right: 13, width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.danger, borderWidth: 1.5, borderColor: '#fff' },

    carMarker: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center' },
    carPulse: { position: 'absolute', top: -8, left: -8, width: 80, height: 80, borderRadius: 40, backgroundColor: t.colors.primary },
    carDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface, ...t.shadow.md },
    etaBadge: { marginTop: 8, backgroundColor: t.colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: t.radius.full, ...t.shadow.sm },
    etaText: { fontFamily: t.fontFamily.semibold, fontSize: 12, color: t.colors.onPrimary },

    locateFab: { position: 'absolute', bottom: '46%', right: t.spacing.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },

    bottomArea: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.base, gap: t.spacing.base },

    pointsWrap: { borderRadius: t.radius.lg, ...t.shadow.md },
    pointsCard: { borderRadius: t.radius.lg, padding: t.spacing.base, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', backgroundColor: t.colors.primary },
    pointsDecor: { position: 'absolute', right: -32, top: -32, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.10)' },
    pointsDecor2: { position: 'absolute', right: 40, bottom: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(110,247,238,0.08)' },
    pointsLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    pointsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    pointsLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: '#D6E3FF', textAlign: 'right' },
    pointsValue: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: '#fff', textAlign: 'right', lineHeight: 28 },
    pointsRight: { alignItems: 'flex-start', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)', paddingRight: t.spacing.base },
    pointsTier: { fontFamily: t.fontFamily.bold, fontSize: 16, color: '#6FF7EE' },

    panel: { backgroundColor: 'rgba(255,255,255,0.97)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: t.radius.xl, padding: t.spacing.lg, ...t.shadow.lg },
    panelTitle: { fontFamily: t.fontFamily.bold, fontSize: 20, color: t.colors.primary, textAlign: 'right', marginBottom: t.spacing.base },
    searchBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.hairline, borderRadius: t.radius.md, paddingHorizontal: t.spacing.base, height: 56, marginBottom: t.spacing.base },
    searchText: { flex: 1, fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right' },
    quickRow: { flexDirection: 'row-reverse', gap: t.spacing.md },
    quickTile: { flex: 1, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.hairline, borderRadius: t.radius.md, paddingVertical: t.spacing.base, alignItems: 'center', gap: 8, ...t.shadow.sm },
    quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.primary },
  });
