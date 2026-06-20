import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Subscription, TripPassenger, Wallet } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { getCurrentLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';
import { LiveMap, type MapPoint } from '../../src/components/LiveMap';
import { PressableScale } from '../../src/components/kit';

const SERVICES: { key: string; icon: IconName; href: string }[] = [
  { key: 'parcels', icon: 'package', href: '/(app)/parcels' },
  { key: 'lostFound', icon: 'search', href: '/(app)/lost-found' },
  { key: 'rewards', icon: 'gift', href: '/(app)/rewards' },
  { key: 'exchange', icon: 'repeat', href: '/(app)/exchange' },
  { key: 'support', icon: 'help-circle', href: '/(app)/support' },
  { key: 'assistant', icon: 'message-circle', href: '/(app)/assistant' },
];

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth((st) => st.user);
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [unread, setUnread] = useState(0);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [trips, setTrips] = useState<TripPassenger[]>([]);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    api.wallet.show().then(setWallet).catch(() => undefined);
    api.notifications.unreadCount().then(setUnread).catch(() => undefined);
    api.transport.mySubscriptions().then((l) => setSub(l.find((x) => x.usable) ?? l[0] ?? null)).catch(() => undefined);
    api.transport.myTrips().then((l) => setTrips(l.slice(0, 3))).catch(() => undefined);
    void getCurrentLocation().then((loc) => loc && setMyLoc(loc));
  }, []);

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '—';

  const mapPoints: MapPoint[] = myLoc ? [{ lat: myLoc.lat, lng: myLoc.lng, kind: 'origin', label: t('home.nearby') }] : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{t('home.hello')}</Text>
            <Text style={s.name} numberOfLines={1}>{user?.full_name ?? ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/notifications')} hitSlop={8} style={s.bell}>
            <Icon name="bell" size={23} color={theme.colors.text} />
            {unread > 0 && <View style={s.dot} />}
          </Pressable>
        </View>

        {/* Map with floating search bar */}
        <View style={s.mapWrap}>
          <LiveMap points={mapPoints} legend={false} height={300} />
          <PressableScale onPress={() => router.push('/(app)/ride-request')} style={s.searchBar}>
            <Icon name="search" size={18} color={theme.colors.primary} />
            <Text style={s.searchText}>{t('home.whereTo')}</Text>
            <Icon name="arrow-left" size={18} color={theme.colors.muted} />
          </PressableScale>
        </View>

        {/* Grouped list: subscription + wallet */}
        <View style={s.group}>
          <Row
            s={s}
            theme={theme}
            icon="calendar"
            label={t('home.activeSubscription')}
            value={sub ? `${sub.remaining_rides ?? '∞'} ${t('subscriptions.rideWord')}` : t('home.subscribeNow')}
            onPress={() => router.push('/(app)/subscriptions')}
          />
          <View style={s.sep} />
          <Row
            s={s}
            theme={theme}
            icon="credit-card"
            label={t('wallet.balance')}
            value={`${wallet ? wallet.balance_jod.toFixed(3) : '—'} ${t('subscriptions.currency')}`}
            onPress={() => router.push('/(app)/wallet')}
          />
        </View>

        {/* Services */}
        <Text style={s.section}>{t('home.moreServices')}</Text>
        <View style={s.servicesGrid}>
          {SERVICES.map((item) => (
            <PressableScale key={item.key} onPress={() => router.push(item.href as never)} style={s.serviceTile}>
              <Icon name={item.icon} size={22} color={theme.colors.text} />
              <Text style={s.serviceLabel} numberOfLines={1}>{t(`home.${item.key}`)}</Text>
            </PressableScale>
          ))}
        </View>

        {/* Recent trips */}
        {trips.length > 0 && (
          <>
            <Text style={s.section}>{t('home.recentTrips')}</Text>
            <View style={s.group}>
              {trips.map((p, i) => (
                <View key={p.id}>
                  {i > 0 && <View style={s.sep} />}
                  <Row
                    s={s}
                    theme={theme}
                    icon="map-pin"
                    label={p.trip?.route?.name ?? t('home.tripFallback')}
                    value={fmtTime(p.trip?.scheduled_at ?? null)}
                    onPress={() => router.push('/(app)/trips')}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** A quiet list row: icon + label on the right, value + chevron on the left. */
function Row({
  s,
  theme,
  icon,
  label,
  value,
  onPress,
}: {
  s: ReturnType<typeof makeStyles>;
  theme: AppTheme;
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={20} color={theme.colors.textSecondary} />
      <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>{value}</Text>
      <Icon name="chevron-left" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: t.spacing.lg },
    greeting: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right', marginTop: 2 },
    bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    dot: { position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.danger, borderWidth: 1.5, borderColor: t.colors.background },

    mapWrap: { borderRadius: t.radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border, marginBottom: t.spacing.xl },
    searchBar: {
      position: 'absolute',
      bottom: t.spacing.md,
      left: t.spacing.md,
      right: t.spacing.md,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: t.spacing.md,
      backgroundColor: t.colors.elevated,
      borderRadius: t.radius.full,
      paddingHorizontal: t.spacing.lg,
      height: 56,
      ...t.shadow.lg,
    },
    searchText: { flex: 1, fontFamily: t.fontFamily.semibold, fontSize: 16, color: t.colors.text, textAlign: 'right' },

    group: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden', marginBottom: t.spacing.xl },
    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingHorizontal: t.spacing.base, height: 60 },
    rowLabel: { flex: 1, fontFamily: t.fontFamily.semibold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    rowValue: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.textSecondary },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border, marginHorizontal: t.spacing.base },

    section: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.md },
    servicesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.lg },
    serviceTile: {
      width: '31.5%',
      aspectRatio: 1.4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    serviceLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text, textAlign: 'center' },
  });
