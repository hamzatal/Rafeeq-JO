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

const SECONDARY: { key: string; icon: IconName; href: string }[] = [
  { key: 'parcels', icon: 'package', href: '/(app)/parcels' },
  { key: 'lostFound', icon: 'search', href: '/(app)/lost-found' },
  { key: 'rewards', icon: 'gift', href: '/(app)/rewards' },
  { key: 'exchange', icon: 'repeat', href: '/(app)/exchange' },
  { key: 'support', icon: 'help-circle', href: '/(app)/support' },
  { key: 'assistant', icon: 'message-circle', href: '/(app)/assistant' },
  { key: 'emergency', icon: 'alert-triangle', href: '/(app)/emergency' },
];

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth((s) => s.user);
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
    api.transport
      .mySubscriptions()
      .then((list) => setSub(list.find((x) => x.usable) ?? list[0] ?? null))
      .catch(() => undefined);
    api.transport
      .myTrips()
      .then((list) => setTrips(list.slice(0, 3)))
      .catch(() => undefined);
    // Center the map on the rider (graceful: stays on default area if denied).
    void getCurrentLocation().then((loc) => loc && setMyLoc(loc));
  }, []);

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('ar', { day: 'numeric', month: 'short' }) : '';

  const mapPoints: MapPoint[] = myLoc ? [{ lat: myLoc.lat, lng: myLoc.lng, kind: 'origin', label: t('home.nearby') }] : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Greeting header */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.greeting}>{t('home.hello')}</Text>
            <Text style={s.name} numberOfLines={1}>{user?.full_name ?? ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/notifications')} style={s.bell}>
            <Icon name="bell" size={22} color={theme.colors.text} />
            {unread > 0 && <View style={s.dot} />}
          </Pressable>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.full_name ?? 'ر').charAt(0)}</Text>
          </View>
        </View>

        {/* Map-first hero: live map + floating "where to?" CTA */}
        <View style={s.mapHero}>
          <View style={s.mapWrap}>
            <LiveMap points={mapPoints} legend={false} height={300} />
          </View>
          <PressableScale onPress={() => router.push('/(app)/ride-request')} style={s.whereToCard}>
            <View style={s.whereToIcon}>
              <Icon name="navigation" size={20} color={theme.colors.onPrimary} />
            </View>
            <View style={s.whereToText}>
              <Text style={s.whereToTitle}>{t('home.whereTo')}</Text>
              <Text style={s.whereToSub}>{t('home.requestRideCta')}</Text>
            </View>
            <Icon name="chevron-left" size={22} color={theme.colors.muted} />
          </PressableScale>
        </View>

        {/* Active subscription */}
        <View style={s.sectionRow}>
          <Text style={s.section}>{t('home.activeSubscription')}</Text>
          <Pressable onPress={() => router.push('/(app)/subscriptions')}>
            <Text style={s.link}>{t('home.viewAll')}</Text>
          </Pressable>
        </View>
        {sub ? (
          <Pressable onPress={() => router.push('/(app)/subscriptions')} style={s.premium}>
            <View style={s.premiumTop}>
              <View style={{ flex: 1 }}>
                <View style={s.activePill}>
                  <Icon name="check-circle" size={13} color={theme.colors.primary} />
                  <Text style={s.activePillText}>{sub.status_label}</Text>
                </View>
                <Text style={s.premiumTitle} numberOfLines={1}>{sub.plan?.name ?? t('home.subscriptions')}</Text>
              </View>
              <View style={s.premiumIcon}>
                <Icon name="navigation" size={22} color={theme.colors.primary} />
              </View>
            </View>
            <View style={s.premiumStats}>
              <View style={{ flex: 1 }}>
                <Text style={s.pStatLabel}>{t('home.remainingRides')}</Text>
                <Text style={s.pStatValue}>{sub.remaining_rides ?? '∞'}</Text>
              </View>
              <View style={s.pDivider} />
              <View style={{ flex: 1 }}>
                <Text style={s.pStatLabel}>{t('home.endsIn')}</Text>
                <Text style={s.pStatValueSm}>{fmtDate(sub.ends_at)}</Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/(app)/subscriptions')} style={s.emptySub}>
            <Icon name="calendar" size={20} color={theme.colors.primary} />
            <Text style={s.emptySubText}>{t('home.noActiveSub')}</Text>
            <Icon name="chevron-left" size={20} color={theme.colors.muted} />
          </Pressable>
        )}

        {/* Wallet quick card */}
        <Pressable onPress={() => router.push('/(app)/wallet')} style={s.walletCard}>
          <View style={s.walletIcon}>
            <Icon name="credit-card" size={20} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.walletLabel}>{t('wallet.balance')}</Text>
            <Text style={s.walletValue}>
              {wallet ? wallet.balance_jod.toFixed(3) : '—'} {t('subscriptions.currency')}
            </Text>
          </View>
          <Icon name="chevron-left" size={20} color={theme.colors.muted} />
        </Pressable>

        {/* Secondary services — horizontal row keeps the home focused */}
        <Text style={[s.section, { marginTop: theme.spacing.lg }]}>{t('home.moreServices')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.servicesRow}>
          {SECONDARY.map((item) => (
            <PressableScale key={item.key} onPress={() => router.push(item.href as never)} style={s.serviceTile}>
              <View style={s.serviceIcon}>
                <Icon name={item.icon} size={22} color={theme.colors.primary} />
              </View>
              <Text style={s.serviceLabel} numberOfLines={1}>{t(`home.${item.key}`)}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        {/* Recent trips */}
        {trips.length > 0 && (
          <>
            <Text style={[s.section, { marginTop: theme.spacing.lg }]}>{t('home.recentTrips')}</Text>
            <View style={{ gap: theme.spacing.sm }}>
              {trips.map((p) => (
                <Pressable key={p.id} onPress={() => router.push('/(app)/trips')} style={s.tripItem}>
                  <View style={s.tripIcon}>
                    <Icon name="map-pin" size={18} color={theme.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tripTitle} numberOfLines={1}>{p.trip?.route?.name ?? t('home.tripFallback')}</Text>
                    <Text style={s.tripSub}>{p.status_label} • {fmtTime(p.trip?.scheduled_at ?? null)}</Text>
                  </View>
                  <Icon name="chevron-left" size={18} color={theme.colors.muted} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: t.spacing.base },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: t.spacing.md },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.onPrimary },
    headerText: { flex: 1 },
    greeting: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right' },
    bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    dot: { position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.danger, borderWidth: 1.5, borderColor: t.colors.surface },

    // Map-first hero
    mapHero: { marginBottom: t.spacing.lg },
    mapWrap: { borderRadius: t.radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border },
    whereToCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.elevated, borderRadius: t.radius.xl, padding: t.spacing.base, marginHorizontal: t.spacing.md, marginTop: -34, borderWidth: 1, borderColor: t.colors.border, ...t.shadow.lg },
    whereToIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    whereToText: { flex: 1 },
    whereToTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 17, color: t.colors.text, textAlign: 'right' },
    whereToSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    sectionRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    section: { fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text, textAlign: 'right' },
    link: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary },

    premium: { backgroundColor: t.colors.primary, borderRadius: t.radius.xl, padding: t.spacing.lg, marginBottom: t.spacing.base, ...t.shadow.md },
    premiumTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: t.spacing.md },
    activePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, alignSelf: 'flex-end', backgroundColor: t.colors.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: t.radius.full, marginBottom: 8 },
    activePillText: { fontFamily: t.fontFamily.bold, fontSize: 11, color: t.colors.primary },
    premiumTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.onPrimary, textAlign: 'right' },
    premiumIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    premiumStats: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: t.radius.lg, padding: t.spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    pStatLabel: { fontFamily: t.fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
    pStatValue: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.accent, textAlign: 'right', marginTop: 2 },
    pStatValueSm: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onPrimary, textAlign: 'right', marginTop: 2 },
    pDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: t.spacing.md },

    emptySub: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.xl, padding: t.spacing.md, borderWidth: 1, borderColor: t.colors.border, marginBottom: t.spacing.base },
    emptySubText: { flex: 1, fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text, textAlign: 'right' },

    walletCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.xl, padding: t.spacing.md, borderWidth: 1, borderColor: t.colors.border, ...t.shadow.sm },
    walletIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    walletLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right' },
    walletValue: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.text, textAlign: 'right', marginTop: 2 },

    servicesRow: { flexDirection: 'row-reverse', gap: t.spacing.md, paddingVertical: 2 },
    serviceTile: { width: 84, alignItems: 'center', gap: 6 },
    serviceIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    serviceLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text, textAlign: 'center' },

    tripItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: t.spacing.sm, borderWidth: 1, borderColor: t.colors.border },
    tripIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    tripTitle: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    tripSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  });
