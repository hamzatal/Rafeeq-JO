import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { SavedAddress, Subscription, Wallet } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { getCurrentLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';
import { LiveMap, type MapPoint } from '../../src/components/LiveMap';
import { PressableScale } from '../../src/components/kit';

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
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    api.notifications.unreadCount().then(setUnread).catch(() => undefined);
    api.addresses.list().then((a) => setAddresses(a.slice(0, 3))).catch(() => undefined);
    api.transport.mySubscriptions().then((l) => setSub(l.find((x) => x.usable) ?? null)).catch(() => undefined);
    api.wallet.show().then(setWallet).catch(() => undefined);
    void getCurrentLocation().then((loc) => loc && setMyLoc(loc));
  }, []);

  const mapPoints: MapPoint[] = myLoc ? [{ lat: myLoc.lat, lng: myLoc.lng, kind: 'origin', label: t('home.nearby') }] : [];
  const labelText = (a: SavedAddress) => {
    const key = `home.label${a.label.charAt(0).toUpperCase()}${a.label.slice(1)}`;
    return a.title || t(key);
  };

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

      {/* Bottom sheet */}
      <View style={[s.sheet, { maxHeight: height * 0.62 }]}>
        <View style={s.grabber} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>
          <Text style={s.hello}>{t('home.hello')}{user?.full_name ? `، ${user.full_name.split(' ')[0]}` : ''}</Text>

          {/* Dominant "Where to?" */}
          <PressableScale onPress={() => router.push('/(app)/ride-request')} style={s.searchBar}>
            <Icon name="search" size={20} color={theme.colors.primary} />
            <Text style={s.searchText}>{t('home.whereTo')}</Text>
            <View style={s.searchNow}>
              <Text style={s.searchNowText}>{t('common.now')}</Text>
            </View>
          </PressableScale>

          {/* Saved destinations */}
          <View style={s.places}>
            {addresses.map((a) => (
              <Pressable key={a.id} onPress={() => router.push('/(app)/ride-request')} style={({ pressed }) => [s.placeRow, pressed && s.pressed]}>
                <View style={s.placeIcon}>
                  <Icon name={LABEL_ICON[a.label] ?? 'map-pin'} size={18} color={theme.colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.placeTitle} numberOfLines={1}>{labelText(a)}</Text>
                  <Text style={s.placeSub} numberOfLines={1}>{a.address_text}</Text>
                </View>
                <Icon name="chevron-left" size={18} color={theme.colors.muted} />
              </Pressable>
            ))}
            <Pressable onPress={() => router.push('/(app)/addresses')} style={({ pressed }) => [s.placeRow, pressed && s.pressed]}>
              <View style={s.placeIcon}>
                <Icon name="plus" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[s.placeTitle, { flex: 1, color: theme.colors.primary }]}>{t('home.addPlace')}</Text>
            </Pressable>
          </View>

          {/* Services strip */}
          <Text style={s.section}>{t('home.services')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.servicesRow}>
            {SERVICES.map((item) => (
              <PressableScale key={item.key} onPress={() => router.push(item.href as never)} style={s.serviceTile}>
                <View style={s.serviceIcon}>
                  <Icon name={item.icon} size={22} color={theme.colors.text} />
                </View>
                <Text style={s.serviceLabel} numberOfLines={1}>{t(`home.${item.key}`)}</Text>
              </PressableScale>
            ))}
          </ScrollView>

          {/* Wallet + subscription compact strip */}
          <View style={s.strip}>
            <Pressable onPress={() => router.push('/(app)/wallet')} style={s.stripItem}>
              <Icon name="credit-card" size={18} color={theme.colors.textSecondary} />
              <Text style={s.stripValue}>{wallet ? wallet.balance_jod.toFixed(2) : '—'}</Text>
              <Text style={s.stripLabel}>{t('wallet.balance')}</Text>
            </Pressable>
            <View style={s.stripDivider} />
            <Pressable onPress={() => router.push('/(app)/subscriptions')} style={s.stripItem}>
              <Icon name="calendar" size={18} color={theme.colors.textSecondary} />
              <Text style={s.stripValue}>{sub ? (sub.remaining_rides ?? '∞') : '—'}</Text>
              <Text style={s.stripLabel}>{t('home.remainingRides')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
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

    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.sm,
      ...t.shadow.lg,
    },
    grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: t.colors.border, marginBottom: t.spacing.base },
    sheetContent: { paddingBottom: t.spacing.xl },
    hello: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },

    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.background, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: t.spacing.base, height: 56 },
    searchText: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text, textAlign: 'right' },
    searchNow: { backgroundColor: t.colors.hairline, borderRadius: t.radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
    searchNowText: { fontFamily: t.fontFamily.semibold, fontSize: 12, color: t.colors.textSecondary },

    places: { marginTop: t.spacing.md },
    placeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingVertical: 10 },
    placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.hairline, alignItems: 'center', justifyContent: 'center' },
    placeTitle: { fontFamily: t.fontFamily.semibold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    placeSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 1 },
    pressed: { opacity: 0.6 },

    section: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    servicesRow: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    serviceTile: { width: 78, alignItems: 'center', gap: 6 },
    serviceIcon: { width: 64, height: 64, borderRadius: t.radius.lg, backgroundColor: t.colors.background, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    serviceLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text, textAlign: 'center' },

    strip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.background, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, marginTop: t.spacing.base, paddingVertical: t.spacing.md },
    stripItem: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
    stripValue: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.text },
    stripLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },
    stripDivider: { width: 1, height: 28, backgroundColor: t.colors.border },
  });
