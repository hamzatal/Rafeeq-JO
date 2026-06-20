import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useI18n } from '../../src/i18n';
import { Button } from '../../src/components/Button';
import { useTheme, type AppTheme } from '../../src/theme';

/**
 * Minimal, premium welcome — restrained neutral canvas, a single clear
 * headline and one primary action (the world-class app pattern), instead of a
 * busy image/scrim/animated-slogans layout.
 */
export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.body}>
          <View style={s.logo}>
            <Text style={s.logoLetter}>ر</Text>
          </View>
          <Text style={s.brand}>رفيق</Text>
          <Text style={s.tagline}>{t('auth.welcomeSubtitle')}</Text>
        </View>

        <View style={s.actions}>
          <Button title={t('auth.register')} onPress={() => router.push('/(auth)/register')} />
          <Pressable onPress={() => router.push('/(auth)/login')} style={s.loginRow} hitSlop={8}>
            <Text style={s.loginMuted}>{t('auth.haveAccount')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md },
    logo: {
      width: 92,
      height: 92,
      borderRadius: 24,
      backgroundColor: t.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing.sm,
    },
    logoImg: { width: 56, height: 56, tintColor: '#FFFFFF' },
    logoLetter: { fontFamily: t.fontFamily.extrabold, fontSize: 52, color: t.colors.onAccent, lineHeight: 60 },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 40, color: t.colors.text, letterSpacing: 0.5 },
    tagline: {
      fontFamily: t.fontFamily.regular,
      fontSize: 16,
      lineHeight: 26,
      color: t.colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
    },
    actions: { gap: t.spacing.base, paddingBottom: t.spacing.lg },
    loginRow: { alignItems: 'center', paddingVertical: 6 },
    loginMuted: { fontFamily: t.fontFamily.semibold, fontSize: 15, color: t.colors.primary },
  });
