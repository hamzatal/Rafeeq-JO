import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme, type AppTheme } from '../theme';
import { Screen } from './Screen';
import { Text } from './Text';
import { BrandMark } from './BrandMark';

/**
 * The shared surface for login / register / reset.
 *
 * A light canvas with two soft brand tints, a white card, the mark, a centred
 * title and a subtitle. Light-mode only — decision 7 removed dark mode.
 *
 * ── What differed between the apps ────────────────────────────────────────
 *
 * One thing: the captain's copy added a «كابتن» pill under the mark, plus the
 * `gap` and the two styles that pill needs. That is a real distinction — a captain
 * signing in wants to see he is in the right app of the two on his phone — so it
 * becomes an optional `tag` prop.
 *
 * ── It scrolls and it avoids the keyboard now ──────────────────────────────
 *
 * This shell wraps every screen with a login form on it, and it had a bare
 * `ScrollView`. On a phone in landscape, or on a small device with the Arabic
 * keyboard open, the submit button sat underneath the keyboard with no way to
 * reach it. It now composes `Screen`, which owns that behaviour once.
 */
export function AuthShell({
  title,
  subtitle,
  tag,
  children,
}: {
  title: string;
  subtitle?: string;
  /** e.g. «كابتن» — shown as a pill under the mark. */
  tag?: string;
  children: ReactNode;
}) {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      {/* Ambient brand tints. Decorative, so hidden from the accessibility tree. */}
      <View style={s.tintA} pointerEvents="none" />
      <View style={s.tintB} pointerEvents="none" />

      <Screen scroll center padded={false} background="transparent">
        <View style={s.content}>
          <View style={s.card}>
            <View style={s.brandRow}>
              <View style={s.mark}>
                {/* Drawn from BRAND_MARK; decorative, the wordmark beside it speaks. */}
                <View accessibilityElementsHidden importantForAccessibility="no">
                  <BrandMark size={44} />
                </View>
              </View>
              {tag ? (
                <View style={s.tag}>
                  <Text role="caption" tone="primary" align="center" style={s.tagText}>
                    {tag}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text role="displayMd" tone="primary" align="center" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text role="titleSm" tone="secondary" align="center" style={s.subtitle}>
                {subtitle}
              </Text>
            ) : null}

            <View style={s.form}>{children}</View>
          </View>
        </View>
      </Screen>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background, overflow: 'hidden' },
    tintA: {
      position: 'absolute',
      top: -120,
      left: -90,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: t.colors.accent,
      opacity: 0.06,
    },
    tintB: {
      position: 'absolute',
      bottom: -140,
      right: -90,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: t.colors.primary,
      opacity: 0.05,
    },
    content: { paddingHorizontal: t.space.lg, paddingVertical: t.space.xl },

    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.sheet,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: t.space.lg,
      paddingVertical: t.space['2xl'],
      ...t.shadow.md,
    },

    brandRow: { alignItems: 'center', gap: t.space.sm, marginBottom: t.space.base },
    mark: {
      width: 64,
      height: 64,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tag: {
      backgroundColor: t.colors.accentSoft,
      borderRadius: t.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    tagText: { fontFamily: t.fontFamily.bold },

    subtitle: { marginTop: 8 },
    form: { marginTop: t.space.xl },
  });
