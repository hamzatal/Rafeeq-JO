import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { text, type RewardSummary } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { getCurrentLocation, watchLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';
import { LiveMap, type MapPoint } from '../../src/components/LiveMap';
import { PressableScale } from '../../src/components/kit';

/**
 * Student home — pixel-faithful implementation of Stitch screen `_15`
 * (Main Dashboard). Layout, order, sizes, spacing, radii, shadows, colours and
 * type scale mirror the Stitch mockup exactly:
 *  map backdrop + fade → greeting pill + bell → car marker + ETA →
 *  points card (نقاط رفيق / الخصم القادم) → search panel (fake search + المنزل/الجامعة).
 * The bottom navigation is provided by TabBar (screen `_15` nav).
 */
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

  const mapPoints: MapPoint[] = myLoc ? [{ lat: myLoc.lat, lng: myLoc.lng, kind: 'origin', label: t('home.nearby') }] : [];
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : '';
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [56, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={s.root}>
      {/* Full-bleed map backdrop */}
      <View style={StyleSheet.absoluteFill}>
        <LiveMap points={mapPoints} legend={false} height={height} />
      </View>

      {/* Ambient bottom fade to #F9F9FF (Stitch map-overlay, ~60% height) */}
      <View style={[s.scrim, s.scrimA]} pointerEvents="none" />
      <View style={[s.scrim, s.scrimB]} pointerEvents="none" />
      <View style={[s.scrim, s.scrimC]} pointerEvents="none" />

      {/* Simulated nearest-captain car marker (top 1/3) + ETA badge */}
      <View style={[s.carWrap, { top: height / 3 - 32 }]} pointerEvents="none">
        <View>
          <Animated.View style={[s.carPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
          <View style={s.carDisc}>
            <MaterialIcons name="directions-car" size={30} color={theme.colors.primary} />
          </View>
        </View>
        <View style={s.etaBadge}>
          <Text style={s.etaText}>٣ {t('home.minutesShort')}</Text>
        </View>
      </View>

      {/* Top bar: greeting pill (start/right) + notifications (end/left) */}
      <SafeAreaView edges={['top']} style={s.topBar} pointerEvents="box-none">
        <View style={s.greetPill}>
          <View style={s.greetAvatar}>
            <Text style={s.greetAvatarText}>{(firstName || 'ر').charAt(0)}</Text>
          </View>
          <View>
            <Text style={s.greetName} numberOfLines={1}>
              {t('home.hello').replace(' 👋', '')}{firstName ? `، ${firstName}` : ''}
            </Text>
            <Text style={s.greetSub}>{t(`home.${greetingKey()}`)}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/(app)/notifications')} style={s.bellBtn} hitSlop={6}>
          <MaterialIcons name="notifications" size={24} color={theme.colors.primary} />
          {unread > 0 && <View style={s.bellDot} />}
        </Pressable>
      </SafeAreaView>

      {/* Bottom action area */}
      <Animated.View style={[s.bottomArea, { opacity: rise, transform: [{ translateY }] }]}>
        {/* Points & status card */}
        <PressableScale onPress={() => router.push('/(app)/rewards')} style={s.pointsCard} scaleTo={0.98}>
          <View style={s.pointsDecor} />
          <View style={s.pointsLeft}>
            <View style={s.pointsIcon}>
              <MaterialIcons name="workspace-premium" size={22} color={theme.colors.accentBright} />
            </View>
            <View>
              <Text style={s.pointsLabel}>{t('home.points')}</Text>
              <Text style={s.pointsValue}>{rewards ? rewards.points.toLocaleString('en-US') : '—'}</Text>
            </View>
          </View>
          <View style={s.pointsRight}>
            <Text style={s.pointsLabel}>{t('home.nextDiscount')}</Text>
            <Text style={s.pointsDiscount}>{rewards?.next_tier_label ?? rewards?.tier_label ?? '—'}</Text>
          </View>
        </PressableScale>

        {/* Where to? panel */}
        <View style={s.panel}>
          <Text style={s.panelTitle}>{t('home.whereTo')}</Text>
          <PressableScale onPress={() => router.push('/(app)/ride-request')} style={s.searchBtn} scaleTo={0.98}>
            <MaterialIcons name="search" size={24} color={theme.colors.accent} />
            <Text style={s.searchText}>{t('home.searchDestination')}</Text>
          </PressableScale>
          <View style={s.quickRow}>
            <QuickAction theme={theme} icon="home" label={t('home.labelHome')} onPress={() => router.push('/(app)/ride-request')} />
            <QuickAction theme={theme} icon="school" label={t('home.labelUniversity')} onPress={() => router.push('/(app)/ride-request')} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function QuickAction({ theme, icon, label, onPress }: { theme: AppTheme; icon: 'home' | 'school'; label: string; onPress: () => void }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <PressableScale onPress={onPress} style={s.quickTile} scaleTo={0.95}>
      <View style={s.quickIcon}>
        <MaterialIcons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </PressableScale>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },

    // Map fade overlay → solid #F9F9FF at the bottom (3 layers approximate the gradient)
    scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    scrimA: { height: '55%', backgroundColor: 'rgba(249,249,255,0.45)' },
    scrimB: { height: '32%', backgroundColor: 'rgba(249,249,255,0.75)' },
    scrimC: { height: '16%', backgroundColor: t.colors.background },

    // Car marker (64px disc) + ETA badge
    carWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    carPulse: { position: 'absolute', top: 4, left: 4, width: 56, height: 56, borderRadius: 28, backgroundColor: t.colors.primary },
    carDisc: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF',
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF',
      shadowColor: '#002045', shadowOpacity: 0.15, shadowRadius: 25, shadowOffset: { width: 0, height: 10 }, elevation: 8,
    },
    etaBadge: { marginTop: 8, backgroundColor: t.colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
    etaText: { ...text.caption, color: t.colors.onPrimary },

    // Top bar
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 8 },
    greetPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, ...t.shadow.sm },
    greetAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    greetAvatarText: { ...text.labelSm, color: t.colors.onPrimary },
    greetName: { ...text.headlineMd, color: t.colors.primary, textAlign: 'right' },
    greetSub: { ...text.caption, color: t.colors.textSecondary, textAlign: 'right' },
    bellBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    bellDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.danger },

    // Bottom action area
    bottomArea: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 128, gap: 16 },

    // Points card (rounded-xl 12, p-4 16)
    pointsCard: { backgroundColor: t.colors.primary, borderRadius: 12, padding: 16, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden', ...t.shadow.lg },
    pointsDecor: { position: 'absolute', right: -32, top: -32, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.10)' },
    pointsLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    pointsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
    pointsLabel: { ...text.caption, color: t.colors.onPrimaryMuted, textAlign: 'right' },
    pointsValue: { ...text.headlineMd, color: '#FFFFFF', textAlign: 'right' },
    pointsRight: { alignItems: 'flex-start', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.20)', paddingRight: 16 },
    pointsDiscount: { ...text.bodyMd, fontFamily: t.fontFamily.bold, color: t.colors.accentBright, textAlign: 'left' },

    // Where-to panel (rounded-2xl 16, p-5 20)
    panel: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', ...t.shadow.md },
    panelTitle: { ...text.headlineMd, fontFamily: t.fontFamily.bold, color: t.colors.primary, textAlign: 'right', marginBottom: 16 },
    searchBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.hairline, borderRadius: 12, padding: 16, marginBottom: 16 },
    searchText: { ...text.bodyMd, color: t.colors.textSecondary, flex: 1, textAlign: 'right' },
    quickRow: { flexDirection: 'row-reverse', gap: 12 },
    quickTile: { flex: 1, backgroundColor: t.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.colors.hairline, alignItems: 'center', gap: 8, ...t.shadow.sm },
    quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { ...text.labelSm, fontFamily: t.fontFamily.semibold, color: t.colors.primary },
  });
