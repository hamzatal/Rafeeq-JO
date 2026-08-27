import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { alpha, brand, neutral } from '@rafeeq/tokens';
import { useReduceMotion } from '../motion';
import { MapBackdrop } from './MapBackdrop';
import { Text } from './Text';

/* ═══════════════════════════════════════════════════════════════════════════
   BRAND SPLASH — the first frame of the product.

   ── Two defects it was carrying ────────────────────────────────────────────

   **1. It was dark in BOTH apps.** Approved decision 15 says the splash is
   «فاتح للطالب، داكن للكابتن» — light for the student, dark for the captain. The
   single shared implementation was `brand[800]` on a dark field, so the student
   app opened dark, against a decision made two phases earlier. It survived
   because the splash is the one screen a reviewer stops seeing after the third
   reload, and because the two apps had SEPARATE copies of this file — so nobody
   ever compared them to the decision, only to each other.

   **2. It had no map.** Decision 15 asks for a faded map behind the mark, and
   `MapBackdrop` has existed in both apps the whole time, used by nothing. The
   splash drew a pulsing circular glow instead. Now it draws the map, which is
   also what the approved mockup shows.

   The slogan is a prop, not a literal: this package holds no UI copy.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface BrandSplashProps {
  /**
   * Light for the student, dark for the captain — decision 15.
   *
   * Required on purpose. A default would let a third app inherit whichever tone
   * happened to be written first, which is how both apps ended up dark.
   */
  tone: 'light' | 'dark';
  /** «رفيقك في كل خطوة جامعية» — passed in, resolved by the app's i18n. */
  slogan: string;
  /** «رفيق» */
  wordmark: string;
}

export function BrandSplash({ tone, slogan, wordmark }: BrandSplashProps) {
  const dark = tone === 'dark';
  const reduceMotion = useReduceMotion();

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    /*
     * Reduce Motion lands the entrance on its END state rather than skipping it.
     *
     * Skipping would leave `scale` at 0.85 and `opacity` at 0 — an invisible,
     * slightly-small logo — because these values are the animation's INPUT, not a
     * decoration on top of a static layout.
     */
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      dots.forEach((d) => d.setValue(1));

      return;
    }

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay((2 - i) * 180),
        ]),
      ),
    );
    loops.forEach((l) => l.start());

    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const s = dark ? darkStyles : lightStyles;

  return (
    <View style={s.container}>
      <MapBackdrop
        roadColor={dark ? alpha(neutral[0], 0.1) : alpha(brand[600], 0.09)}
        routeColor={dark ? brand[200] : brand[600]}
        nodeColor={dark ? alpha(neutral[0], 0.3) : alpha(brand[600], 0.22)}
        opacity={dark ? 1 : 0.9}
      />

      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <View style={s.emblem}>
          <Image
            source={require('../../assets/r-logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
            /* Decorative: the wordmark below already says «رفيق». */
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>

        <Text role="displayMd" align="center" style={s.word}>
          {wordmark}
        </Text>
        <Text role="bodyLg" align="center" style={s.tag}>
          {slogan}
        </Text>

        <View style={styles.dots}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                s.dot,
                {
                  opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                  transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.25] }) }],
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoImg: { width: 56, height: 56 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 40 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

const base = {
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' } as const,
  emblem: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  } as const,
};

const darkStyles = StyleSheet.create({
  container: { ...base.container, backgroundColor: brand[800] },
  emblem: { ...base.emblem, backgroundColor: alpha(neutral[0], 0.06), borderColor: alpha(neutral[0], 0.12) },
  word: { color: neutral[0], letterSpacing: 1 },
  tag: { color: brand[200], marginTop: 12 },
  dot: { backgroundColor: brand[200] },
});

const lightStyles = StyleSheet.create({
  container: { ...base.container, backgroundColor: neutral[50] },
  emblem: { ...base.emblem, backgroundColor: neutral[0], borderColor: brand[100] },
  word: { color: brand[600], letterSpacing: 1 },
  tag: { color: neutral[600], marginTop: 12 },
  dot: { backgroundColor: brand[600] },
});
