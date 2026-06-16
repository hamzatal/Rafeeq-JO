import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { useI18n } from '../../src/i18n';
import { theme } from '../../src/theme';

export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Screen center>
      <View style={styles.brandWrap}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>رفيق</Text>
        </View>
        <Text style={styles.badge}>كابتن</Text>
        <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
        <Text style={styles.subtitle}>انضم كشريك نقل معتمد في رفيق</Text>
      </View>

      <View style={styles.actions}>
        <Button title={t('auth.register')} onPress={() => router.push('/(auth)/register')} />
        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>{t('auth.haveAccount')}</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
  },
  logoText: { color: theme.colors.onPrimary, fontFamily: theme.fontFamily.extrabold, fontSize: 28 },
  badge: {
    color: theme.colors.primary,
    fontFamily: theme.fontFamily.bold,
    fontSize: 14,
    marginBottom: theme.spacing.lg,
    letterSpacing: 2,
  },
  title: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: 26,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.fontFamily.regular,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actions: { gap: theme.spacing.base, paddingBottom: theme.spacing.xl },
  link: { alignSelf: 'center', padding: theme.spacing.sm },
  linkText: { color: theme.colors.primary, fontFamily: theme.fontFamily.medium, fontSize: 15 },
});
