import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useI18n } from '../../src/i18n';
import { useTheme, type AppTheme } from '../../src/theme';

const PHRASES: { ar: string; en: string }[] = [
  { ar: 'اقبل الرحلات… وزد دخلك مع رفيق 🚗', en: 'Accept rides — grow your income with Rafeeq 🚗' },
  { ar: 'أنت وشطارتك… كل رحلة فرصة', en: 'You and your hustle — every ride is an opportunity' },
  { ar: 'أرباحك تصلك بسرعة وبشفافية', en: 'Your earnings, fast and transparent' },
];

export default function Welcome() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const enter = useRef(new Animated.Value(0)).current;
  const phraseFade = useRef(new Animated.Value(1)).current;
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const id = setInterval(() => {
      Animated.timing(phraseFade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setPhrase((p) => (p + 1) % PHRASES.length);
        Animated.timing(phraseFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ImageBackground source={require('../../assets/splash-map.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover">
        <View style={s.scrim} />
      </ImageBackground>
      <View style={s.glowA} />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <Animated.View style={[s.hero, { opacity: enter, transform: [{ translateY }] }]}>
          <View style={s.logo}>
            <Image source={require('../../assets/r-logo.png')} style={s.logoImg} resizeMode="contain" />
          </View>
          <Text style={s.brand}>Rafeeq</Text>
          <Text style={s.badge}>{t('driver.badge')}</Text>
          <Animated.Text style={[s.phrase, { opacity: phraseFade }]}>
            {locale === 'ar' ? PHRASES[phrase].ar : PHRASES[phrase].en}
          </Animated.Text>
          <View style={s.dots}>
            {PHRASES.map((_, i) => (
              <View key={i} style={[s.dot, i === phrase && s.dotActive]} />
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[s.actions, { opacity: enter }]}>
          <Pressable onPress={() => router.push('/(auth)/register')} style={({ pressed }) => [s.ctaPrimary, pressed && s.pressed]}>
            <Text style={s.ctaPrimaryText}>{t('auth.register')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [s.ctaOutline, pressed && s.pressed]}>
            <Text style={s.ctaOutlineText}>{t('auth.haveAccount')}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background, overflow: 'hidden' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: t.colors.background, opacity: 0.84 },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    glowA: { position: 'absolute', top: -90, right: -70, width: 260, height: 260, borderRadius: 130, backgroundColor: t.colors.primary, opacity: 0.16 },

    hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.base, borderWidth: 3, borderColor: t.colors.primary },
    logoImg: { width: 74, height: 74 },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 42, color: '#FFFFFF', letterSpacing: 1 },
    badge: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary, letterSpacing: 3, marginTop: 4, marginBottom: t.spacing.base },
    phrase: { fontFamily: t.fontFamily.bold, fontSize: 19, color: '#FFFFFF', textAlign: 'center', lineHeight: 30, maxWidth: 320, minHeight: 64 },
    dots: { flexDirection: 'row', gap: 7, marginTop: t.spacing.base },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
    dotActive: { backgroundColor: t.colors.primary, width: 20 },

    actions: { gap: t.spacing.md, paddingBottom: t.spacing.lg },
    ctaPrimary: { backgroundColor: t.colors.primary, height: 54, borderRadius: t.radius.xl, alignItems: 'center', justifyContent: 'center' },
    ctaPrimaryText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.onPrimary },
    ctaOutline: { height: 54, borderRadius: t.radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.05)' },
    ctaOutlineText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: '#FFFFFF' },
    pressed: { opacity: 0.85 },
  });
