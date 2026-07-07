import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useI18n } from '../../src/i18n';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/store/auth';
import { useTheme, type AppTheme } from '../../src/theme';

/** Stitch landing (captain) — clean light canvas, teal brand mark, one CTA. */
export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const devLogin = useAuth((st) => st.devLogin);

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <View style={s.tintA} pointerEvents="none" />
      <View style={s.tintB} pointerEvents="none" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.body}>
          <View style={s.mark}>
            <Image source={require('../../assets/r-logo.png')} style={s.markLogo} resizeMode="contain" />
          </View>
          <View style={s.brandRow}>
            <Text style={s.brand}>رفيق</Text>
            <View style={s.tag}><Text style={s.tagText}>كابتن</Text></View>
          </View>
          <Text style={s.tagline}>{t('auth.captainSignupSub')}</Text>
        </View>

        <View style={s.actions}>
          <Button title={t('auth.register')} onPress={() => router.push('/(auth)/register')} />
          <Pressable onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [s.secondary, pressed && s.pressed]}>
            <Text style={s.secondaryText}>{t('auth.login')}</Text>
          </Pressable>

          {__DEV__ ? (
            <Pressable
              onPress={async () => {
                await devLogin();
                router.replace('/(app)/dashboard');
              }}
              hitSlop={8}
              style={s.devLink}
            >
              <Text style={s.devText}>دخول تجريبي (معاينة بدون خادم)</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background, overflow: 'hidden' },
    tintA: { position: 'absolute', top: -110, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.08 },
    tintB: { position: 'absolute', bottom: -150, left: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.primary, opacity: 0.05 },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md },
    mark: { width: 104, height: 104, borderRadius: 30, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm, borderWidth: 1, borderColor: t.colors.hairline, ...t.shadow.md },
    markLogo: { width: 72, height: 72 },
    brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 44, color: t.colors.primary, letterSpacing: 0.5 },
    tag: { backgroundColor: t.colors.accentSoft, borderRadius: t.radius.full, paddingHorizontal: 12, paddingVertical: 5 },
    tagText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.accent },
    tagline: { fontFamily: t.fontFamily.regular, fontSize: 16, lineHeight: 26, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 300 },
    actions: { gap: t.spacing.md, paddingBottom: t.spacing.lg },
    secondary: { height: 54, borderRadius: t.radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.primary, backgroundColor: 'transparent' },
    secondaryText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.primary },
    pressed: { opacity: 0.75 },
    devLink: { alignItems: 'center', marginTop: t.spacing.xs, paddingVertical: 6 },
    devText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.accent, textDecorationLine: 'underline' },
  });
