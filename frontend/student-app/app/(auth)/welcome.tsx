import { useMemo } from 'react';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { useI18n } from '../../src/i18n';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen center>
      <View style={s.brandWrap}>
        <View style={s.logo}>
          <Text style={s.glyph}>R</Text>
        </View>
        <Text style={s.title}>{t('auth.welcomeTitle')}</Text>
        <Text style={s.subtitle}>{t('auth.welcomeSubtitle')}</Text>
      </View>

      <View style={s.actions}>
        <Button title={t('auth.register')} onPress={() => router.push('/(auth)/register')} />
        <Link href="/(auth)/login" style={s.link}>
          <Text style={s.linkText}>{t('auth.haveAccount')}</Text>
        </Link>
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    brandWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    logo: { width: 104, height: 104, borderRadius: 52, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.xl, borderWidth: 4, borderColor: t.colors.accent },
    glyph: { fontFamily: t.fontFamily.extrabold, fontSize: 54, color: '#FFFFFF' },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, marginBottom: t.spacing.sm },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 16, color: t.colors.textSecondary, textAlign: 'center' },
    actions: { gap: t.spacing.base, paddingBottom: t.spacing.xl },
    link: { alignSelf: 'center', padding: t.spacing.sm },
    linkText: { color: t.colors.primary, fontFamily: t.fontFamily.medium, fontSize: 15 },
  });
