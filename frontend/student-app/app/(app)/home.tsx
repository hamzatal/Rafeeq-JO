import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { theme } from '../../src/theme';

export default function Home() {
  const { t } = useI18n();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const services: { key: string; label: string }[] = [
    { key: 'subscriptions', label: t('home.subscriptions') },
    { key: 'trips', label: t('home.trips') },
    { key: 'parcels', label: t('home.parcels') },
    { key: 'lostFound', label: t('home.lostFound') },
    { key: 'rewards', label: t('home.rewards') },
    { key: 'support', label: t('home.support') },
    { key: 'wallet', label: t('home.wallet') },
    { key: 'assistant', label: t('home.assistant') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>أهلاً 👋</Text>
            <Text style={styles.name}>{user?.full_name ?? ''}</Text>
          </View>
          <Pressable onPress={logout} style={styles.logout}>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {services.map((s) => (
            <View key={s.key} style={styles.card}>
              <Text style={styles.cardLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  greeting: { fontFamily: theme.fontFamily.regular, fontSize: 15, color: theme.colors.textSecondary, textAlign: 'right' },
  name: { fontFamily: theme.fontFamily.extrabold, fontSize: 22, color: theme.colors.text, textAlign: 'right' },
  logout: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  logoutText: { color: theme.colors.danger, fontFamily: theme.fontFamily.medium, fontSize: 13 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: theme.spacing.base },
  card: {
    width: '47%',
    height: 110,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text },
});
