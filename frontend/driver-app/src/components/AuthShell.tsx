import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, type AppTheme } from '../theme';

/**
 * Unified, premium auth background for login / register / reset (captain).
 * Slightly-dark canvas + soft lime glow + unified brand mark + clear title and
 * subtitle — the same visual language as the student app.
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
      <StatusBar style="light" />
      <View style={s.glow} />
      <View style={s.glow2} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.brandRow}>
            <View style={s.mark}>
              <Image source={require('../../assets/r-logo.png')} style={s.markLogo} resizeMode="contain" />
            </View>
            <Text style={s.brand}>رفيق</Text>
            <View style={s.captainTag}>
              <Text style={s.captainTagText}>كابتن</Text>
            </View>
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
    root: { flex: 1, backgroundColor: '#0A0D12', overflow: 'hidden' },
    glow: { position: 'absolute', top: -120, left: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: t.colors.accent, opacity: 0.16 },
    glow2: { position: 'absolute', bottom: -140, right: -90, width: 280, height: 280, borderRadius: 140, backgroundColor: t.colors.accent, opacity: 0.07 },
    safe: { flex: 1 },
    content: { flexGrow: 1, paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.xl, paddingBottom: t.spacing.lg },

    brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing['2xl'] },
    mark: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    markLogo: { width: 38, height: 38 },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: '#FFFFFF' },
    captainTag: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: t.radius.full, paddingHorizontal: 10, paddingVertical: 4 },
    captainTagText: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.accent },

    title: { fontFamily: t.fontFamily.extrabold, fontSize: 30, color: '#FFFFFF', textAlign: 'right', lineHeight: 40 },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: 'rgba(255,255,255,0.65)', textAlign: 'right', marginTop: 8 },

    form: { marginTop: t.spacing['2xl'] },
  });
