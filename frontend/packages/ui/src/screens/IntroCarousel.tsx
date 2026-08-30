/* ═══════════════════════════════════════════════════════════════════════════
   THE ONBOARDING CAROUSEL — one copy.

   `student-app/app/(onboarding)/intro.tsx` and its captain twin were 135 and 131
   lines with **twelve** differing lines, and nine of those twelve were comments.
   The three that mattered were the slide table: three icons and six translation
   keys. Everything else — the fade transition, the hero circle, the rounded sheet,
   the dots, the CTA, 40 lines of styles — was written twice.

   ── Why the slides are a prop and the layout is not ────────────────────────

   The slides ARE the difference between the two apps: a student is being told about
   pooling and safety, a captain about earnings and their vehicle. The sheet they
   are told it in is a design decision that must not diverge, and it had already
   started to — the captain's copy had lost the three section comments, which is how
   two files stop being comparable at a glance and then stop being equal at all.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { brand } from '@rafeeq/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon, type IconName } from '../components/Icon';
import { Text } from '../components/Text';
import { useI18n } from '../runtime/i18n';
import { useTheme, type AppTheme } from '../theme';

export interface IntroSlide {
  icon: IconName;
  titleKey: string;
  bodyKey: string;
}

export interface IntroCarouselProps {
  slides: IntroSlide[];
  /** Skip, or finish the last slide without going on to permissions. */
  onSkip: () => void;
  /** The last slide's CTA — normally the permission-priming screen. */
  onDone: () => void;
}

export function IntroCarousel({ slides, onSkip, onDone }: IntroCarouselProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const last = index === slides.length - 1;

  const transition = (next: number) => {
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setIndex(next);
      Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  };

  const advance = () => (last ? onDone() : transition(index + 1));

  const slide = slides[index];
  if (!slide) return null;

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* Skip pill (top, end-aligned) */}
      <SafeAreaView edges={['top']} style={s.skipSafe}>
        <View style={s.skipRow}>
          <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" style={s.skipPill}>
            <Text role="body" tone="primary" style={s.skipText}>{t('onboarding.skip')}</Text>
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
            {slides.map((sl, i) => (
              <View key={sl.titleKey} style={[s.dot, i === index && s.dotActive]} />
            ))}
          </View>
          <Animated.View style={{ opacity: fade }}>
            <Text role="displayMd" tone="primary" align="center" style={s.title}>{t(slide.titleKey)}</Text>
            <Text role="bodyLg" tone="secondary" align="center" style={s.text}>{t(slide.bodyKey)}</Text>
          </Animated.View>
          <Pressable onPress={advance} accessibilityRole="button" style={({ pressed }) => [s.cta, pressed && s.pressed]}>
            <Text role="titleLg" tone="inverse" align="center">{last ? t('onboarding.getStarted') : t('common.next')}</Text>
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
    skipPill: { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
    skipText: { fontFamily: t.fontFamily.medium },

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
      shadowColor: brand[900],
      shadowOffset: { width: 0, height: -15 },
      shadowOpacity: 0.06,
      shadowRadius: 40,
      elevation: 12,
    },
    dots: { flexDirection: 'row', alignSelf: 'center', gap: 8, marginBottom: 32 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.surfaceHighest },
    dotActive: { backgroundColor: t.colors.primary, width: 32 },

    title: { marginBottom: 16 },
    text: { maxWidth: 300, alignSelf: 'center', marginBottom: 40 },

    cta: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, alignSelf: 'stretch' },
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
