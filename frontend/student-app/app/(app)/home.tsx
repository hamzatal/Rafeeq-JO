import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

/** Service grid — the full "super app" surface, richer than a short rail. */
const SERVICES: { key: string; icon: IconName; href: string; tone?: 'danger' }[] = [
  { key: 'subscriptions', icon: 'calendar', href: '/(app)/subscriptions' },
  { key: 'trips', icon: 'map', href: '/(app)/trips' },
  { key: 'parcels', icon: 'package', href: '/(app)/parcels' },
  { key: 'wallet', icon: 'credit-card', href: '/(app)/wallet' },
  { key: 'rewards', icon: 'gift', href: '/(app)/rewards' },
  { key: 'lostFound', icon: 'search', href: '/(app)/lost-found' },
  { key: 'exchange', icon: 'repeat', href: '/(app)/exchange' },
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
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [unread, setUnread] = useState(0);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fade]);

  useEffect(() => {
    api.notifications.unreadCount().then(setUnread).catch(() => undefined);
    api.addresses.list().then((a) => setAddresses(a.slice(0, 3))).catch(() => undefined);
    Promise.allSettled([
      api.transport.mySubscriptions().then((l) => setSub(l.find((x) => x.usable) ?? null)),
      api.wallet.show().then(setWallet),
    ]).finally(() => setLoading(false));
    // Real position immediately, then keep it live.
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
  const labelText = (a: SavedAddress) => {
    const key = `home.label${a.label.charAt(0).toUpperCase()}${a.label.slice(1)}`;
    return a.title || t(key);
  };

  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY }] }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            {/* ── Greeting bar ─────────────────────────────── */}
            <View style={s.topBar}>
              <View style={s.identity}>
                <View style={s.avatar}>
                  <Text style={s.avatarInitial}>{(firstName || 'ر').charAt(0)}</Text>
                </View>
                <View>
                  <Text style={s.hello}>{t('home.hello')}</Text>
                  {!!firstName && <Text style={s.name} numberOfLines={1}>{firstName}</Text>}
                </View>
              </View>
              <View style={s.topActions}>
                <Pressable onPress={() => router.push('/(app)/notifications')} style={s.iconBtn} hitSlop={6}>
                  <Icon name="bell" size={20} color={theme.colors.text} />
                  {unread > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={() => router.push('/(app)/settings')} style={s.iconBtn} hitSlop={6}>
                  <Icon name="user" size={20} color={theme.colors.text} />
                </Pressable>
              </View>
            </View>

            {/* ── Signature hero: request a ride ───────────── */}
            <PressableScale onPress={() => router.push('/(app)/ride-request')} style={s.hero}>
              <View style={s.heroGlowA} />
              <View style={s.heroGlowB} />
              <View style={s.heroBody}>
                <Text style={s.heroKicker}>{t('home.whereTo')}</Text>
                <Text style={s.heroTitle}>{t('home.requestRideCta')}</Text>
                <View style={s.heroCta}>
                  <Text style={s.heroCtaText}>{t('home.rideRequest')}</Text>
                  <Icon name="arrow-left" size={16} color={theme.colors.accent} />
                </View>
              </View>
              <View style={s.heroBadge}>
                <Icon name="navigation" size={26} color={theme.colors.onAccent} />
              </View>
            </PressableScale>

            {/* ── Stat cards: wallet + subscription ────────── */}
            <View style={s.statsRow}>
              <Pressable onPress={() => router.push('/(app)/wallet')} style={s.statCard}>
                <View style={s.statIcon}><Icon name="credit-card" size={18} color={theme.colors.accent} /></View>
                {loading ? <Skeleton width={54} height={20} /> : (
                  <Text style={s.statValue}>{wallet ? wallet.balance_jod.toFixed(2) : '0.00'}<Text style={s.statUnit}> {t('subscriptions.currency')}</Text></Text>
                )}
                <Text style={s.statLabel}>{t('wallet.balance')}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(app)/subscriptions')} style={s.statCard}>
                <View style={s.statIcon}><Icon name="calendar" size={18} color={theme.colors.accent} /></View>
                {loading ? <Skeleton width={54} height={20} /> : (
                  <Text style={s.statValue}>{sub ? (sub.remaining_rides ?? '∞') : '—'}</Text>
                )}
                <Text style={s.statLabel}>{t('home.remainingRides')}</Text>
              </Pressable>
            </View>

            {/* ── Live map card (your real location) ───────── */}
            <View style={s.mapCard}>
              <View style={s.mapWrap}>
                <LiveMap points={mapPoints} legend={false} height={200} />
              </View>
              <View style={s.mapChip} pointerEvents="none">
                <View style={s.liveDot} />
                <Text style={s.mapChipText}>{myLoc ? t('home.nearby') : t('home.locating')}</Text>
              </View>
              <Pressable onPress={recenter} style={s.recenter} hitSlop={8}>
                <Icon name="crosshair" size={20} color={theme.colors.accent} />
              </Pressable>
            </View>

            {/* ── Saved destinations ───────────────────────── */}
            {addresses.map((a) => (
              <Pressable key={a.id} onPress={() => router.push('/(app)/ride-request')} style={({ pressed }) => [s.placeRow, pressed && s.pressed]}>
                <View style={s.placeIcon}>
                  <Icon name={LABEL_ICON[a.label] ?? 'map-pin'} size={18} color={theme.colors.accent} />
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
                <Icon name="plus" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[s.placeTitle, { flex: 1 }]}>{t('home.addPlace')}</Text>
              <Icon name="chevron-left" size={18} color={theme.colors.muted} />
            </Pressable>

            {/* ── Services grid ────────────────────────────── */}
            <Text style={s.section}>{t('home.services')}</Text>
            <View style={s.grid}>
              {SERVICES.map((item) => (
                <PressableScale key={item.key} onPress={() => router.push(item.href as never)} style={s.tile}>
                  <View style={s.tileIcon}>
                    <Icon name={item.icon} size={22} color={theme.colors.accent} />
                  </View>
                  <Text style={s.tileLabel} numberOfLines={1}>{t(`home.${item.key}`)}</Text>
                </PressableScale>
              ))}
            </View>

            {/* ── Emergency (always reachable) ─────────────── */}
            <PressableScale onPress={() => router.push('/(app)/emergency')} style={s.sos}>
              <View style={s.sosIcon}><Icon name="alert-triangle" size={18} color={theme.colors.danger} /></View>
              <Text style={s.sosText}>{t('home.emergency')}</Text>
              <Icon name="chevron-left" size={18} color={theme.colors.danger} />
            </PressableScale>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    scroll: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.sm, paddingBottom: t.spacing['3xl'] },

    // Greeting bar
    topBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.lg },
    identity: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.accent },
    hello: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.text, textAlign: 'right' },
    topActions: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    iconBtn: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    badge: { position: 'absolute', top: 7, right: 8, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: t.colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.colors.card },
    badgeText: { fontFamily: t.fontFamily.extrabold, fontSize: 9, color: '#FFFFFF' },

    // Signature hero
    hero: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.accent, borderRadius: t.radius['2xl'], padding: t.spacing.lg, overflow: 'hidden', ...t.shadow.md },
    heroGlowA: { position: 'absolute', top: -40, left: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroGlowB: { position: 'absolute', bottom: -50, left: 60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
    heroBody: { flex: 1 },
    heroKicker: { fontFamily: t.fontFamily.medium, fontSize: 13, color: 'rgba(255,255,255,0.82)', textAlign: 'right' },
    heroTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.onAccent, textAlign: 'right', marginTop: 4 },
    heroCta: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'flex-end', gap: 6, backgroundColor: '#FFFFFF', borderRadius: t.radius.full, paddingVertical: 7, paddingHorizontal: 14, marginTop: t.spacing.base },
    heroCtaText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.accent },
    heroBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },

    // Stat cards
    statsRow: { flexDirection: 'row-reverse', gap: t.spacing.md, marginTop: t.spacing.md },
    statCard: { flex: 1, backgroundColor: t.colors.card, borderRadius: t.radius.xl, padding: t.spacing.base, ...t.shadow.sm },
    statIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm },
    statValue: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right' },
    statUnit: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.textSecondary },
    statLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    // Map card
    mapCard: { marginTop: t.spacing.md, borderRadius: t.radius['2xl'], overflow: 'hidden', backgroundColor: t.colors.card, ...t.shadow.sm },
    mapWrap: { height: 200, width: '100%' },
    mapChip: { position: 'absolute', top: t.spacing.md, right: t.spacing.md, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: t.colors.scrim, borderRadius: t.radius.full, paddingVertical: 6, paddingHorizontal: 12 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.success },
    mapChipText: { fontFamily: t.fontFamily.semibold, fontSize: 12, color: '#FFFFFF' },
    recenter: { position: 'absolute', bottom: t.spacing.md, left: t.spacing.md, width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },

    // Saved places
    placeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.card, borderRadius: t.radius.lg, paddingVertical: t.spacing.md, paddingHorizontal: t.spacing.base, marginTop: t.spacing.sm, ...t.shadow.sm },
    placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    placeTitle: { fontFamily: t.fontFamily.semibold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    placeSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 1 },
    pressed: { opacity: 0.6 },

    // Services grid
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.xl, marginBottom: t.spacing.md },
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: t.spacing.base },
    tile: { width: '23%', alignItems: 'center', gap: 8 },
    tileIcon: { width: '100%', aspectRatio: 1, borderRadius: t.radius.xl, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    tileLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.textSecondary, textAlign: 'center' },

    // Emergency
    sos: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.dangerSoft, borderRadius: t.radius.lg, paddingVertical: t.spacing.md, paddingHorizontal: t.spacing.base, marginTop: t.spacing.xl },
    sosIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center' },
    sosText: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.danger, textAlign: 'right' },
  });
