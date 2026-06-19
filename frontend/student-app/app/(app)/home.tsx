import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Subscription, TripPassenger, Wallet } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';
import { ServiceTile } from '../../src/components/ui';

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
  }, []);

  const services: { key: string; icon: IconName; href?: string }[] = [
    { key: 'subscriptions', icon: 'calendar', href: '/(app)/subscriptions' },
    { key: 'payments', icon: 'dollar-sign', href: '/(app)/payments' },
    { key: 'parcels', icon: 'package', href: '/(app)/parcels' },
    { key: 'lostFound', icon: 'search', href: '/(app)/lost-found' },
    { key: 'rewards', icon: 'gift', href: '/(app)/rewards' },
    { key: 'exchange', icon: 'repeat', href: '/(app)/exchange' },
    { key: 'support', icon: 'help-circle', href: '/(app)/support' },
    { key: 'assistant', icon: 'message-circle', href: '/(app)/assistant' },
    { key: 'emergency', icon: 'alert-triangle', href: '/(app)/emergency' },
  ];

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('ar', { day: 'numeric', month: 'short' }) : '';

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

        {/* Hero: where to? → request ride */}
        <Pressable
          onPress={() => router.push('/(app)/ride-request')}
          style={({ pressed }) => [s.hero, pressed && s.pressed]}
        >
          <View style={s.heroIcon}>
            <Icon name="navigation" size={22} color={theme.colors.onPrimary} />
          </View>
          <View style={s.heroText}>
            <Text style={s.heroTitle}>إلى أين نتجه اليوم؟</Text>
            <Text style={s.heroSub}>{t('home.rideRequest')}</Text>
          </View>
          <Icon name="chevron-left" size={22} color={theme.colors.muted} />
        </Pressable>

        {/* Active subscription — premium navy card */}
        <View style={s.sectionRow}>
          <Text style={s.section}>اشتراكاتي الفعّالة</Text>
          <Pressable onPress={() => router.push('/(app)/subscriptions')}>
            <Text style={s.link}>عرض الكل</Text>
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
                <Text style={s.premiumTitle} numberOfLines={1}>{sub.plan?.name ?? 'اشتراك رفيق'}</Text>
              </View>
              <View style={s.premiumIcon}>
                <Icon name="navigation" size={22} color={theme.colors.primary} />
              </View>
            </View>
            <View style={s.premiumStats}>
              <View style={{ flex: 1 }}>
                <Text style={s.pStatLabel}>الرحلات المتبقية</Text>
                <Text style={s.pStatValue}>{sub.remaining_rides ?? '∞'}</Text>
              </View>
              <View style={s.pDivider} />
              <View style={{ flex: 1 }}>
                <Text style={s.pStatLabel}>تنتهي في</Text>
                <Text style={s.pStatValueSm}>{fmtDate(sub.ends_at)}</Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/(app)/subscriptions')} style={s.emptySub}>
            <Icon name="calendar" size={20} color={theme.colors.primary} />
            <Text style={s.emptySubText}>لا يوجد اشتراك فعّال — اشترك الآن</Text>
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

        {/* Services */}
        <Text style={[s.section, { marginTop: theme.spacing.lg }]}>{t('home.services')}</Text>
        <View style={s.grid}>
          {services.map((item) => (
            <ServiceTile
              key={item.key}
              icon={item.icon}
              label={t(`home.${item.key}`)}
              onPress={() => item.href && router.push(item.href as never)}
            />
          ))}
        </View>

        {/* Recent trips */}
        {trips.length > 0 && (
          <>
            <Text style={[s.section, { marginTop: theme.spacing.lg }]}>رحلات سابقة</Text>
            <View style={{ gap: theme.spacing.sm }}>
              {trips.map((p) => (
                <Pressable key={p.id} onPress={() => router.push('/(app)/trips')} style={s.tripItem}>
                  <View style={s.tripIcon}>
                    <Icon name="map-pin" size={18} color={theme.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tripTitle} numberOfLines={1}>{p.trip?.route?.name ?? 'رحلة'}</Text>
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

    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: t.spacing.lg },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: t.spacing.md },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.onPrimary },
    headerText: { flex: 1 },
    greeting: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right' },
    bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    dot: { position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.danger, borderWidth: 1.5, borderColor: t.colors.surface },

    hero: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.surface, borderRadius: t.radius.xl, padding: t.spacing.base, borderWidth: 1, borderColor: t.colors.border, marginBottom: t.spacing.lg, ...t.shadow.sm },
    heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    heroText: { flex: 1 },
    heroTitle: { fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text, textAlign: 'right' },
    heroSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    pressed: { opacity: 0.9 },

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

    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },

    tripItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: t.spacing.sm, borderWidth: 1, borderColor: t.colors.border },
    tripIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    tripTitle: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    tripSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  });
