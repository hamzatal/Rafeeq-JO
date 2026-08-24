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
  { icon: 'navigation', titleKey: 'onboarding.s1Title', bodyKey: 'onboarding.s1Body' },
  { icon: 'map-pin', titleKey: 'onboarding.s2Title', bodyKey: 'onboarding.s2Body' },
  { icon: 'shield', titleKey: 'onboarding.s3Title', bodyKey: 'onboarding.s3Body' },
];

/** Onboarding carousel — pixel-faithful to Stitch `1/2/3`: hero illustration
 *  area on top, a rounded-top sheet with progress dots + title + body + CTA. */
export default function Intro() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const setIntroSeen = usePrefs((st) => st.setIntroSeen);

  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const last = index === SLIDES.length - 1;

  const transition = (next: number) => {
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setIndex(next);
      Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  };

  const skip = async () => {
    await setIntroSeen();
    router.replace('/(auth)/welcome');
  };

  const advance = () => {
    if (last) router.replace('/(onboarding)/permissions');
    else transition(index + 1);
  };

  const slide = SLIDES[index];

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />

      {/* Skip pill (top, end-aligned) */}
      <SafeAreaView edges={['top']} style={s.skipSafe}>
        <View style={s.skipRow}>
          <Pressable onPress={skip} hitSlop={8} style={s.skipPill}>
            <Text style={s.skip}>{t('onboarding.skip')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Hero illustration area */}
      <Animated.View style={[s.hero, { opacity: fade }]}>
        <View style={s.heroGlow} />
        <View style={s.heroCircle}>
          <Icon name={slide.icon} size={88} color={theme.colors.primary} />
        </View>
      </Animated.View>

      {/* Bottom sheet */}
      <View style={s.sheet}>
        <SafeAreaView edges={['bottom']}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === index && s.dotActive]} />
            ))}
          </View>
          <Animated.View style={{ opacity: fade }}>
            <Text style={s.title}>{t(slide.titleKey)}</Text>
            <Text style={s.text}>{t(slide.bodyKey)}</Text>
          </Animated.View>
          <Pressable onPress={advance} style={({ pressed }) => [s.cta, pressed && s.pressed]}>
            <Text style={s.ctaText}>{last ? t('onboarding.getStarted') : t('common.next')}</Text>
            <Icon name="arrow-left" size={22} color={theme.colors.onPrimary} />
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    skipSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
    skipRow: { flexDirection: 'row', justifyContent: 'flex-start', padding: t.spacing.lg },
    skipPill: { backgroundColor: t.colors.surfaceAlt, borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8 },
    skip: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.primary },

    hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.spacing.lg },
    heroGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.1 },
    heroCircle: { width: 200, height: 200, borderRadius: 100, backgroundColor: t.colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

    sheet: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 8,
      alignItems: 'center',
      shadowColor: '#002045',
      shadowOffset: { width: 0, height: -15 },
      shadowOpacity: 0.06,
      shadowRadius: 40,
      elevation: 12,
    },
    dots: { flexDirection: 'row', alignSelf: 'center', gap: 8, marginBottom: 32 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.surfaceHighest },
    dotActive: { backgroundColor: t.colors.primary, width: 32 },

    title: { fontFamily: t.fontFamily.extrabold, fontSize: 32, lineHeight: 40, color: t.colors.primary, textAlign: 'center', marginBottom: 16 },
    text: { fontFamily: t.fontFamily.regular, fontSize: 18, lineHeight: 28, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 300, alignSelf: 'center', marginBottom: 40 },

    cta: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, alignSelf: 'stretch' },
    ctaText: { fontFamily: t.fontFamily.semibold, fontSize: 24, lineHeight: 32, color: t.colors.onPrimary },
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
