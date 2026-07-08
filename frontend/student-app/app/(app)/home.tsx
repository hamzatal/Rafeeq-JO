import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
 * Student home — map-first layout: a full-screen live map with a draggable
 * "where to?" bottom sheet the rider can pull down to reveal the whole map.
 * Points live in a compact chip in the sheet header (no more oversized card).
 */
function greetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'goodMorning';
  if (h < 18) return 'goodAfternoon';
  return 'goodEvening';
}

const PEEK = 96; // visible height of the sheet when collapsed (handle + header)

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
  const [collapsed, setCollapsed] = useState(false);

  const rise = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(0)).current;
  const sheetH = useRef(0);
  const startY = useRef(0);


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

  const snapTo = (toCollapsed: boolean) => {
    const maxY = Math.max(0, sheetH.current - PEEK);
    Animated.spring(sheetY, { toValue: toCollapsed ? maxY : 0, useNativeDriver: true, bounciness: 2, speed: 14 }).start();
    setCollapsed(toCollapsed);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => sheetY.stopAnimation((v) => { startY.current = v; }),
      onPanResponderMove: (_e, g) => {
        const maxY = Math.max(0, sheetH.current - PEEK);
        sheetY.setValue(Math.min(Math.max(0, startY.current + g.dy), maxY));
      },
      onPanResponderRelease: (_e, g) => {
        const maxY = Math.max(0, sheetH.current - PEEK);
        const current = Math.min(Math.max(0, startY.current + g.dy), maxY);
        snapTo(g.vy > 0.4 || (g.vy >= -0.4 && current > maxY / 2));
      },
    }),
  ).current;

  const mapPoints: MapPoint[] = myLoc ? [{ lat: myLoc.lat, lng: myLoc.lng, kind: 'origin', label: t('home.nearby') }] : [];
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : '';
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [56, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });


  return (
    <View style={s.root}>
      {/* Full-screen live map */}
      <View style={StyleSheet.absoluteFill}>
        <LiveMap points={mapPoints} legend={false} height={height} />
      </View>

      {/* Light top fade for status-bar/greeting legibility only */}
      <View style={s.topScrim} pointerEvents="none" />

      {/* Nearest-captain marker + ETA (upper third) */}
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

      {/* Top bar: greeting pill + notifications */}
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
          <MaterialIcons name="notifications" size={22} color={theme.colors.primary} />
          {unread > 0 && <View style={s.bellDot} />}
        </Pressable>
      </SafeAreaView>


      {/* Draggable "where to?" sheet */}
      <Animated.View
        style={[s.sheet, { transform: [{ translateY: Animated.add(sheetY, translateY) }], opacity: rise }]}
        onLayout={(e) => { sheetH.current = e.nativeEvent.layout.height; }}
      >
        {/* Header (drag handle + title + points chip) */}
        <View {...pan.panHandlers} style={s.sheetHeader}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Pressable onPress={() => snapTo(!collapsed)} hitSlop={8} style={s.titleRow}>
              <Text style={s.sheetTitle}>{t('home.whereTo')}</Text>
              <MaterialIcons name={collapsed ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={theme.colors.muted} />
            </Pressable>
            <PressableScale onPress={() => router.push('/(app)/rewards')} style={s.pointsChip} scaleTo={0.94}>
              <MaterialIcons name="stars" size={16} color={theme.colors.accent} />
              <Text style={s.pointsChipText}>{rewards ? rewards.points.toLocaleString('en-US') : '—'}</Text>
            </PressableScale>
          </View>
        </View>

        {/* Body */}
        <View style={s.sheetBody}>
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
    topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 140, backgroundColor: 'rgba(249,249,255,0.55)' },

    // Car marker + ETA
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
    greetPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, ...t.shadow.sm },
    greetAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    greetAvatarText: { ...text.labelSm, color: t.colors.onPrimary },
    greetName: { ...text.bodyMd, fontFamily: t.fontFamily.bold, color: t.colors.primary, textAlign: 'right' },
    greetSub: { ...text.caption, color: t.colors.textSecondary, textAlign: 'right' },
    bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    bellDot: { position: 'absolute', top: 11, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.danger },


    // Draggable sheet
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 92,
      backgroundColor: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 20,
      shadowColor: '#002045', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 16,
    },
    sheetHeader: { paddingTop: 10, paddingBottom: 8 },
    handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: t.colors.surfaceHighest, marginBottom: 12 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
    sheetTitle: { fontFamily: t.fontFamily.bold, fontSize: 20, lineHeight: 28, color: t.colors.primary, textAlign: 'right' },
    pointsChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.hairline, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
    pointsChipText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary },

    sheetBody: { paddingTop: 8, gap: 12 },
    searchBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.hairline, borderRadius: 12, padding: 16 },
    searchText: { ...text.bodyMd, color: t.colors.textSecondary, flex: 1, textAlign: 'right' },
    quickRow: { flexDirection: 'row-reverse', gap: 12 },
    quickTile: { flex: 1, backgroundColor: t.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.colors.hairline, alignItems: 'center', gap: 8, ...t.shadow.sm },
    quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { ...text.labelSm, fontFamily: t.fontFamily.semibold, color: t.colors.primary },
  });
