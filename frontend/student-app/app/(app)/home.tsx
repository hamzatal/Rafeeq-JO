import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Wallet } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';
import { ServiceTile, StatCard } from '../../src/components/ui';

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.wallet.show().then(setWallet).catch(() => undefined);
    api.notifications.unreadCount().then(setUnread).catch(() => undefined);
  }, []);

  const services: { key: string; icon: IconName; href?: string; soon?: boolean }[] = [
    { key: 'subscriptions', icon: 'calendar', href: '/(app)/subscriptions' },
    { key: 'payments', icon: 'dollar-sign', href: '/(app)/payments' },
    { key: 'parcels', icon: 'package', href: '/(app)/parcels' },
    { key: 'lostFound', icon: 'search', href: '/(app)/lost-found' },
    { key: 'rewards', icon: 'gift', href: '/(app)/rewards' },
    { key: 'exchange', icon: 'repeat', href: '/(app)/exchange' },
    { key: 'support', icon: 'help-circle', href: '/(app)/support' },
    { key: 'assistant', icon: 'message-circle', soon: true },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.full_name ?? 'ر').charAt(0)}</Text>
          </View>
          <View style={s.headerText}>
            <Text style={s.greeting}>{t('home.hello')}</Text>
            <Text style={s.name} numberOfLines={1}>{user?.full_name ?? ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/notifications')} style={s.bell}>
            <Icon name="bell" size={22} color={theme.colors.text} />
            {unread > 0 && <View style={s.dot} />}
          </Pressable>
        </View>

        {/* Hero CTA — request a ride */}
        <Pressable onPress={() => router.push('/(app)/ride-request')} style={({ pressed }) => [s.hero, pressed && s.pressed]}>
          <View style={s.heroIcon}>
            <Icon name="navigation" size={26} color={theme.colors.onPrimary} />
          </View>
          <View style={s.heroText}>
            <Text style={s.heroTitle}>{t('home.rideRequest')}</Text>
            <Text style={s.heroSub}>{t('rideRequest.title')}</Text>
          </View>
          <Icon name="chevron-left" size={24} color={theme.colors.onPrimary} />
        </Pressable>

        {/* Wallet balance */}
        <StatCard
          label={t('wallet.balance')}
          value={`${wallet ? wallet.balance_jod.toFixed(3) : '—'} ${t('subscriptions.currency')}`}
          icon="credit-card"
          onPress={() => router.push('/(app)/wallet')}
        />

        {/* Services */}
        <Text style={s.section}>{t('home.services')}</Text>
        <View style={s.grid}>
          {services.map((item) => (
            <ServiceTile
              key={item.key}
              icon={item.icon}
              label={t(`home.${item.key}`)}
              soon={item.soon}
              onPress={() => item.href && router.push(item.href as never)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: t.spacing.lg },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.onPrimary },
    headerText: { flex: 1 },
    greeting: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text, textAlign: 'right' },
    bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    dot: { position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.danger, borderWidth: 1.5, borderColor: t.colors.surface },

    hero: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.primary, borderRadius: t.radius.xl, padding: t.spacing.lg, marginBottom: t.spacing.base, ...t.shadow.md },
    heroIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    heroText: { flex: 1 },
    heroTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.onPrimary, textAlign: 'right' },
    heroSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.onPrimary, opacity: 0.85, textAlign: 'right', marginTop: 2 },
    pressed: { opacity: 0.9 },

    section: { fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.base },
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  });
