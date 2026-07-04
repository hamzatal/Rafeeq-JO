import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useI18n } from '../../src/i18n';
import { Button } from '../../src/components/Button';
import { useTheme, type AppTheme } from '../../src/theme';

/** Onyx premium landing — deep ink canvas, soft blue glow, brand mark, one CTA. */
export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.glow} />
      <View style={s.glow2} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.body}>
          <View style={s.mark}>
            <Image source={require('../../assets/r-logo.png')} style={s.markLogo} resizeMode="contain" />
          </View>
          <Text style={s.brand}>رفيق</Text>
          <Text style={s.tagline}>{t('auth.welcomeSubtitle')}</Text>
        </View>

        <View style={s.actions}>
          <Button title={t('auth.register')} onPress={() => router.push('/(auth)/register')} />
          <Pressable onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [s.secondary, pressed && s.pressed]}>
            <Text style={s.secondaryText}>{t('auth.login')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0A0D12', overflow: 'hidden' },
    glow: { position: 'absolute', top: -110, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.18 },
    glow2: { position: 'absolute', bottom: -150, left: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.08 },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md },
    mark: { width: 96, height: 96, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm },
    markLogo: { width: 68, height: 68 },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 42, color: '#FFFFFF', letterSpacing: 0.5 },
    tagline: { fontFamily: t.fontFamily.regular, fontSize: 16, lineHeight: 26, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 300 },
    actions: { gap: t.spacing.md, paddingBottom: t.spacing.lg },
    secondary: { height: 54, borderRadius: t.radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.05)' },
    secondaryText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: '#FFFFFF' },
    pressed: { opacity: 0.75 },
  });
