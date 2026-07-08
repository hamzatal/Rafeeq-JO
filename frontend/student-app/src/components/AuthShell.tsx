import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, type AppTheme } from '../theme';

/**
 * Unified auth surface for login / register / reset — Stitch design system.
 * A clean light "clean-room" canvas (off-white) with a white rounded card,
 * the teal brand mark, a centered navy title and a friendly subtitle. One
 * shared visual language across the student & captain apps, matching the
 * Stitch splash + onboarding + register (_14) screens. LIGHT-MODE ONLY.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {/* Soft ambient brand tints */}
      <View style={s.tintA} pointerEvents="none" />
      <View style={s.tintB} pointerEvents="none" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.brandRow}>
              <View style={s.mark}>
                <Image source={require('../../assets/r-logo.png')} style={s.markLogo} resizeMode="contain" />
              </View>
            </View>

            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

            <View style={s.form}>{children}</View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background, overflow: 'hidden' },
    tintA: { position: 'absolute', top: -120, left: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.06 },
    tintB: { position: 'absolute', bottom: -140, right: -90, width: 280, height: 280, borderRadius: 140, backgroundColor: t.colors.primary, opacity: 0.05 },
    safe: { flex: 1 },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.xl },

    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.xl,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing['2xl'],
      ...t.shadow.md,
    },

    brandRow: { alignItems: 'center', marginBottom: t.spacing.base },
    mark: { width: 64, height: 64, borderRadius: t.radius.lg, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    markLogo: { width: 44, height: 44 },

    title: { fontFamily: t.fontFamily.extrabold, fontSize: 28, color: t.colors.primary, textAlign: 'center', lineHeight: 38 },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'center', marginTop: 8 },

    form: { marginTop: t.spacing.xl },
  });
