import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.glowA} />
      <View style={s.glowB} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.hero}>
          <View style={s.logo}>
            <Icon name="shield" size={46} color={theme.colors.accent} />
          </View>
          <Text style={s.brand}>رفيق</Text>
          <Text style={s.title}>{t('guardian.portalTitle')}</Text>
          <Text style={s.subtitle}>{t('guardian.portalSubtitle')}</Text>
        </View>
        <View style={s.actions}>
          <Pressable onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [s.cta, pressed && s.pressed]}>
            <Text style={s.ctaText}>{t('guardian.login')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.primary, overflow: 'hidden' },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    glowA: { position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: t.colors.accent, opacity: 0.16 },
    glowB: { position: 'absolute', bottom: 40, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: t.colors.accent, opacity: 0.07 },
    hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(230,178,62,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.lg, borderWidth: 3, borderColor: t.colors.accent },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 34, color: '#FFFFFF', marginBottom: t.spacing.base },
    title: { fontFamily: t.fontFamily.bold, fontSize: 22, color: '#FFFFFF', textAlign: 'center', marginBottom: t.spacing.sm },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 24, maxWidth: 300 },
    actions: { paddingBottom: t.spacing.lg },
    cta: { backgroundColor: t.colors.accent, height: 54, borderRadius: t.radius.xl, alignItems: 'center', justifyContent: 'center' },
    ctaText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    pressed: { opacity: 0.85 },
  });
