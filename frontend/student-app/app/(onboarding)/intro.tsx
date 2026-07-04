import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useI18n } from '../../src/i18n';
import { usePrefs } from '../../src/store/prefs';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';

interface Slide {
  icon: IconName;
  titleKey: string;
  bodyKey: string;
}

const SLIDES: Slide[] = [
  { icon: 'map', titleKey: 'onboarding.s1Title', bodyKey: 'onboarding.s1Body' },
  { icon: 'credit-card', titleKey: 'onboarding.s2Title', bodyKey: 'onboarding.s2Body' },
  { icon: 'shield', titleKey: 'onboarding.s3Title', bodyKey: 'onboarding.s3Body' },
];

export default function Intro() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const setIntroSeen = usePrefs((st) => st.setIntroSeen);

  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const last = index === SLIDES.length - 1;

  const transition = (next: number) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: -24, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setIndex(next);
      slideX.setValue(24);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideX, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const done = async () => {
    await setIntroSeen();
    router.replace('/(auth)/welcome');
  };

  const advance = () => {
    if (last) void done();
    else transition(index + 1);
  };

  const slide = SLIDES[index];

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={s.glow} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.topBar}>
          <Text style={s.brand}>رفيق</Text>
          <Pressable onPress={done} hitSlop={12}>
            <Text style={s.skip}>{t('onboarding.skip')}</Text>
          </Pressable>
        </View>

        {/* Hero panel */}
        <Animated.View style={[s.hero, { opacity: fade, transform: [{ translateX: slideX }] }]}>
          <View style={s.heroGlow} />
          <View style={s.iconCircle}>
            <Icon name={slide.icon} size={64} color={theme.colors.accent} />
          </View>
        </Animated.View>

        {/* Copy */}
        <Animated.View style={[s.copy, { opacity: fade, transform: [{ translateX: slideX }] }]}>
          <Text style={s.title}>{t(slide.titleKey)}</Text>
          <Text style={s.body}>{t(slide.bodyKey)}</Text>
        </Animated.View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === index && s.dotActive]} />
            ))}
          </View>
          <Pressable onPress={advance} style={({ pressed }) => [s.cta, pressed && s.pressed]}>
            <Text style={s.ctaText}>{last ? t('onboarding.getStarted') : t('common.next')}</Text>
            <Icon name={last ? 'arrow-left' : 'chevron-left'} size={20} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background, overflow: 'hidden' },
    glow: { position: 'absolute', top: -140, right: -110, width: 360, height: 360, borderRadius: 180, backgroundColor: t.colors.accent, opacity: 0.09 },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },

    topBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingTop: t.spacing.sm },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text },
    skip: { fontFamily: t.fontFamily.semibold, fontSize: 15, color: t.colors.textSecondary },

    hero: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: t.spacing.base },
    heroGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: t.colors.accentSoft },
    iconCircle: {
      width: 168,
      height: 168,
      borderRadius: 52,
      backgroundColor: t.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadow.lg,
    },

    copy: { alignItems: 'center', gap: t.spacing.md, paddingHorizontal: t.spacing.sm, marginBottom: t.spacing.xl },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 28, color: t.colors.text, textAlign: 'center', lineHeight: 40 },
    body: { fontFamily: t.fontFamily.regular, fontSize: 16, lineHeight: 27, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 340 },

    footer: { paddingBottom: t.spacing.lg, gap: t.spacing.lg },
    dots: { flexDirection: 'row', alignSelf: 'center', gap: 7 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.border },
    dotActive: { backgroundColor: t.colors.accent, width: 26 },
    cta: { flexDirection: 'row-reverse', gap: 8, backgroundColor: t.colors.primary, height: 56, borderRadius: t.radius.xl, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },
    ctaText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.onPrimary },
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
