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
    if (last) {
      router.replace('/(onboarding)/permissions');
    } else {
      transition(index + 1);
    }
  };

  const slide = SLIDES[index];

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={s.glow} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.topBar}>
          <Pressable onPress={skip} hitSlop={12}>
            <Text style={s.skip}>{t('onboarding.skip')}</Text>
          </Pressable>
        </View>

        <Animated.View style={[s.body, { opacity: fade }]}>
          <View style={s.iconWrap}>
            <Icon name={slide.icon} size={56} color={theme.colors.primary} />
          </View>
          <Text style={s.title}>{t(slide.titleKey)}</Text>
          <Text style={s.text}>{t(slide.bodyKey)}</Text>
        </Animated.View>

        <View style={s.footer}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === index && s.dotActive]} />
            ))}
          </View>
          <Pressable onPress={advance} style={({ pressed }) => [s.cta, pressed && s.pressed]}>
            <Text style={s.ctaText}>{last ? t('onboarding.getStarted') : t('common.next')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background, overflow: 'hidden' },
    glow: { position: 'absolute', top: -120, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.12 },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    topBar: { flexDirection: 'row-reverse', paddingTop: t.spacing.sm },
    skip: { fontFamily: t.fontFamily.semibold, fontSize: 15, color: t.colors.textSecondary },

    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.lg },
    iconWrap: { width: 128, height: 128, borderRadius: 64, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.accent + '33' },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'center', paddingHorizontal: t.spacing.lg },
    text: { fontFamily: t.fontFamily.regular, fontSize: 16, lineHeight: 26, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 330 },

    footer: { paddingBottom: t.spacing.lg, gap: t.spacing.lg },
    dots: { flexDirection: 'row', alignSelf: 'center', gap: 7 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.border },
    dotActive: { backgroundColor: t.colors.primary, width: 22 },
    cta: { backgroundColor: t.colors.primary, height: 54, borderRadius: t.radius.lg, alignItems: 'center', justifyContent: 'center' },
    ctaText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.onPrimary },
    pressed: { opacity: 0.88 },
  });
