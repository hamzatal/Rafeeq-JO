import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, type AppTheme } from '../theme';

/**
 * Unified auth background for login / reset (Onyx, light).
 * A clean near-white canvas with a soft signature-blue glow, the floating brand
 * mark, a clear title and a friendly subtitle — the same light language used by
 * the register screen and the rest of the app, so nothing jumps dark↔light.
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
      <View style={s.glow} />
      <View style={s.glow2} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.brandRow}>
            <View style={s.mark}>
              <Image source={require('../../assets/r-logo.png')} style={s.markLogo} resizeMode="contain" />
            </View>
            <Text style={s.brand}>رفيق</Text>
          </View>

          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

          <View style={s.form}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background, overflow: 'hidden' },
    glow: { position: 'absolute', top: -130, left: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.09 },
    glow2: { position: 'absolute', bottom: -150, right: -90, width: 280, height: 280, borderRadius: 140, backgroundColor: t.colors.accent, opacity: 0.05 },
    safe: { flex: 1 },
    content: { flexGrow: 1, paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.xl, paddingBottom: t.spacing.lg },

    brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing['2xl'] },
    mark: { width: 54, height: 54, borderRadius: 16, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },
    markLogo: { width: 38, height: 38 },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text },

    title: { fontFamily: t.fontFamily.extrabold, fontSize: 30, color: t.colors.text, textAlign: 'right', lineHeight: 40 },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'right', marginTop: 8 },

    form: { marginTop: t.spacing['2xl'] },
  });
