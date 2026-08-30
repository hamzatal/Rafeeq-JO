/* ═══════════════════════════════════════════════════════════════════════════
   THE LANDING SCREEN — one copy.

   The two versions differed in a badge pill («كابتن» beside the wordmark), one
   translation key for the tagline, and a docblock. Three real differences across
   58 and 64 lines, including 15 lines of identical styles.

   The student copy also carried a dead `import { useAuth }` that nothing in the
   file used — the kind of thing that survives because `noUnusedLocals` is off, and
   the kind of thing a second copy of a file makes twice as likely.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { useI18n } from '../runtime/i18n';
import { useTheme, type AppTheme } from '../theme';

export interface WelcomeScreenProps {
  /** Each app bundles its own asset, so the source has to come from the app. */
  logo: ImageSourcePropType;
  /**
   * A pill beside the wordmark, e.g. «كابتن».
   *
   * The captain app needs it because the two apps ship under one brand and a
   * captain who downloaded the wrong one should find out on this screen rather
   * than after creating an account.
   */
  badge?: string;
  /** Which promise this audience is being made. */
  taglineKey: string;
  onRegister: () => void;
  onLogin: () => void;
}

export function WelcomeScreen({ logo, badge, taglineKey, onRegister, onLogin }: WelcomeScreenProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <View style={s.tintA} pointerEvents="none" />
      <View style={s.tintB} pointerEvents="none" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.body}>
          <View style={s.mark}>
            <Image source={logo} style={s.markLogo} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <View style={s.brandRow}>
            <Text role="displayLg" tone="primary" align="center" style={s.brand}>{t('common.appName')}</Text>
            {badge ? (
              <View style={s.tag}>
                <Text role="titleSm" tone="primary" align="center" style={s.tagText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text role="bodyLg" tone="secondary" align="center" style={s.tagline}>{t(taglineKey)}</Text>
        </View>

        <View style={s.actions}>
          <Button title={t('auth.register')} onPress={onRegister} />
          <Pressable onPress={onLogin} accessibilityRole="button" style={({ pressed }) => [s.secondary, pressed && s.pressed]}>
            <Text role="titleMd" tone="primary" align="center">{t('auth.login')}</Text>
          </Pressable>
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
    brand: { letterSpacing: 0.5 },
    tag: { backgroundColor: t.colors.accentSoft, borderRadius: t.radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
    tagText: { fontFamily: t.fontFamily.bold, color: t.colors.accent },
    tagline: { maxWidth: 300 },
    actions: { gap: t.spacing.md, paddingBottom: t.spacing.lg },
    secondary: { height: 54, borderRadius: t.radius.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.primary, backgroundColor: 'transparent' },
    pressed: { opacity: 0.75 },
  });
