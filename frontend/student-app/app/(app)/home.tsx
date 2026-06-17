import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const services: { key: string; label: string; href?: string }[] = [
    { key: 'rideRequest', label: t('home.rideRequest'), href: '/(app)/ride-request' },
    { key: 'subscriptions', label: t('home.subscriptions'), href: '/(app)/subscriptions' },
    { key: 'trips', label: t('home.trips'), href: '/(app)/trips' },
    { key: 'wallet', label: t('home.wallet'), href: '/(app)/wallet' },
    { key: 'payments', label: t('home.payments'), href: '/(app)/payments' },
    { key: 'notifications', label: t('home.notifications'), href: '/(app)/notifications' },
    { key: 'parcels', label: t('home.parcels') },
    { key: 'lostFound', label: t('home.lostFound') },
    { key: 'rewards', label: t('home.rewards') },
    { key: 'support', label: t('home.support') },
    { key: 'assistant', label: t('home.assistant') },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{t('home.hello')}</Text>
            <Text style={s.name}>{user?.full_name ?? ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/settings')} style={s.iconBtn}>
            <Text style={s.iconText}>⚙︎</Text>
          </Pressable>
        </View>

        <View style={s.grid}>
          {services.map((item) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [s.card, pressed && item.href ? s.pressed : null]}
              onPress={() => item.href && router.push(item.href as never)}
            >
              <Text style={s.cardLabel}>{item.label}</Text>
              {!item.href && <Text style={s.soon}>{t('common.soon')}</Text>}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg },
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.xl },
    greeting: { fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right' },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right' },
    iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    iconText: { fontSize: 18, color: t.colors.text },
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.base },
    card: { width: '47%', height: 110, backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
    cardLabel: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    soon: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, marginTop: 4 },
    pressed: { opacity: 0.7, borderColor: t.colors.primary },
  });
