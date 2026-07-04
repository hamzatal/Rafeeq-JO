import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { SavedAddress, Subscription, Wallet } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { getCurrentLocation, watchLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';
import { LiveMap, type MapPoint } from '../../src/components/LiveMap';
import { PressableScale, Skeleton } from '../../src/components/kit';

const SERVICES: { key: string; icon: IconName; href: string }[] = [
  { key: 'subscriptions', icon: 'calendar', href: '/(app)/subscriptions' },
  { key: 'parcels', icon: 'package', href: '/(app)/parcels' },
  { key: 'rewards', icon: 'gift', href: '/(app)/rewards' },
  { key: 'lostFound', icon: 'search', href: '/(app)/lost-found' },
  { key: 'support', icon: 'help-circle', href: '/(app)/support' },
];

const LABEL_ICON: Record<string, IconName> = {
  home: 'home',
  university: 'book-open',
  work: 'briefcase',
  other: 'map-pin',
};

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth((st) => st.user);
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [unread, setUnread] = useState(0);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadingStrip, setLoadingStrip] = useState(true);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Bottom-sheet entrance animation.
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);

  useEffect(() => {
    api.notifications.unreadCount().then(setUnread).catch(() => undefined);
    api.addresses.list().then((a) => setAddresses(a.slice(0, 2))).catch(() => undefined);
    Promise.allSettled([
      api.transport.mySubscriptions().then((l) => setSub(l.find((x) => x.usable) ?? null)),
      api.wallet.show().then(setWallet),
    ]).finally(() => setLoadingStrip(false));
    // Show the user's REAL position immediately, then keep it live.
    void getCurrentLocation().then((loc) => loc && setMyLoc(loc));
    const stop = watchLocation((loc) => setMyLoc(loc));
    return stop;
  }, []);

  const recenter = async () => {
    const loc = await getCurrentLocation();
    if (loc) setMyLoc({ ...loc });
  };

  const mapPoints: MapPoint[] = myLoc ? [{ lat: myLoc.lat, lng: myLoc.lng, kind: 'origin', label: t('home.nearby') }] : [];
  const labelText = (a: SavedAddress) => {
    const key = `home.label${a.label.charAt(0).toUpperCase()}${a.label.slice(1)}`;
    return a.title || t(key);
  };

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={s.root}>
      {/* Full-bleed map (the app IS the map) */}
      <View style={StyleSheet.absoluteFill}>
        <LiveMap points={mapPoints} legend={false} height={height} />
      </View>

      {/* Floating top controls */}
      <SafeAreaView edges={['top']} style={s.topBar} pointerEvents="box-none">
        <Pressable onPress={() => router.push('/(app)/settings')} style={s.fab} hitSlop={6}>
          <Text style={s.fabInitial}>{(user?.full_name ?? 'ر').charAt(0)}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/notifications')} style={s.fab} hitSlop={6}>
          <Icon name="bell" size={20} color={theme.colors.text} />
          {unread > 0 && <View style={s.fabDot} />}
        </Pressable>
      </SafeAreaView>

      {/* Recenter to my real location */}
      <Pressable onPress={recenter} style={s.locateFab} hitSlop={8}>
        <Icon name="crosshair" size={20} color={theme.colors.accent} />
      </Pressable>

      {/* Bottom sheet (animated entrance) */}
      <Animated.View style={[s.sheet, { maxHeight: height * 0.6, opacity: rise, transform: [{ translateY }] }]}>
        <View style={s.grabber} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>
          <Text style={s.hello}>{t('home.hello')}{user?.full_name ? `، ${user.full_name.split(' ')[0]}` : ''} 👋</Text>

          {/* Hero "Where to?" CTA */}
          <PressableScale onPress={() => router.push('/(app)/ride-request')} style={s.searchBar}>
            <View style={s.searchIcon}>
              <Icon name="navigation" size={18} color={theme.colors.onAccent} />
            </View>
            <Text style={s.searchText}>{t('home.whereTo')}</Text>
            <Icon name="chevron-left" size={20} color={theme.colors.muted} />
          </PressableScale>

          {/* Saved destinations (compact) */}
          {addresses.map((a) => (
            <Pressable key={a.id} onPress={() => router.push('/(app)/ride-request')} style={({ pressed }) => [s.placeRow, pressed && s.pressed]}>
              <View style={s.placeIcon}>
                <Icon name={LABEL_ICON[a.label] ?? 'map-pin'} size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.placeTitle} numberOfLines={1}>{labelText(a)}</Text>
                <Text style={s.placeSub} numberOfLines={1}>{a.address_text}</Text>
              </View>
              <Icon name="chevron-left" size={18} color={theme.colors.muted} />
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/(app)/addresses')} style={({ pressed }) => [s.placeRow, pressed && s.pressed]}>
            <View style={[s.placeIcon, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="plus" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[s.placeTitle, { flex: 1, color: theme.colors.primary }]}>{t('home.addPlace')}</Text>
          </Pressable>

          {/* Services strip */}
          <Text style={s.section}>{t('home.services')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.servicesRow}>
            {SERVICES.map((item) => (
              <PressableScale key={item.key} onPress={() => router.push(item.href as never)} style={s.serviceTile}>
                <View style={s.serviceIcon}>
                  <Icon name={item.icon} size={22} color={theme.colors.primary} />
                </View>
                <Text style={s.serviceLabel} numberOfLines={1}>{t(`home.${item.key}`)}</Text>
              </PressableScale>
            ))}
          </ScrollView>

          {/* Wallet + subscription compact strip */}
          <View style={s.strip}>
            <Pressable onPress={() => router.push('/(app)/wallet')} style={s.stripItem}>
              <Icon name="credit-card" size={18} color={theme.colors.textSecondary} />
              {loadingStrip ? <Skeleton width={40} height={16} /> : <Text style={s.stripValue}>{wallet ? wallet.balance_jod.toFixed(2) : '0.00'}</Text>}
              <Text style={s.stripLabel}>{t('wallet.balance')}</Text>
            </Pressable>
            <View style={s.stripDivider} />
            <Pressable onPress={() => router.push('/(app)/subscriptions')} style={s.stripItem}>
              <Icon name="calendar" size={18} color={theme.colors.textSecondary} />
              {loadingStrip ? <Skeleton width={30} height={16} /> : <Text style={s.stripValue}>{sub ? (sub.remaining_rides ?? '∞') : '—'}</Text>}
              <Text style={s.stripLabel}>{t('home.remainingRides')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },

    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.sm },
    fab: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },
    fabInitial: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.primary },
    fabDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.danger, borderWidth: 1.5, borderColor: t.colors.surface },

    locateFab: { position: 'absolute', bottom: '42%', right: t.spacing.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },

    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.sm,
      ...t.shadow.lg,
    },
    grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: t.colors.border, marginBottom: t.spacing.base },
    sheetContent: { paddingBottom: t.spacing.xl },
    hello: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },

    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.card, borderRadius: t.radius.xl, paddingHorizontal: t.spacing.md, height: 62, ...t.shadow.sm },
    searchIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center' },
    searchText: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text, textAlign: 'right' },

    placeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingVertical: 10 },
    placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.hairline, alignItems: 'center', justifyContent: 'center' },
    placeTitle: { fontFamily: t.fontFamily.semibold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    placeSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 1 },
    pressed: { opacity: 0.6 },

    section: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    servicesRow: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    serviceTile: { width: 78, alignItems: 'center', gap: 6 },
    serviceIcon: { width: 64, height: 64, borderRadius: t.radius.xl, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    serviceLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text, textAlign: 'center' },

    strip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.xl, marginTop: t.spacing.base, paddingVertical: t.spacing.base, ...t.shadow.sm },
    stripItem: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
    stripValue: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.text },
    stripLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },
    stripDivider: { width: 1, height: 28, backgroundColor: t.colors.border },
  });
