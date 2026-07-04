import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTheme, type AppTheme } from '../theme';
import { Icon } from './Icon';

/**
 * Formal auth scaffold (DS v7 "Onyx") — one structured language for every auth
 * screen: a clean light canvas with a soft blue brand glow, an ink brand mark,
 * a bold right-aligned title + subtitle, and a form area. Deliberately formal
 * (not playful) to suit a transport product.
 */
export function AuthScaffold({
  title,
  subtitle,
  children,
  showBack = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={s.glow} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.topRow}>
            <View style={s.mark}>
              <Image source={require('../../assets/r-logo.png')} style={s.markLogo} resizeMode="contain" />
            </View>
            {showBack ? (
              <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
                <Icon name="chevron-right" size={22} color={theme.colors.text} />
              </Pressable>
            ) : null}
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
    glow: { position: 'absolute', top: -150, left: -100, width: 340, height: 340, borderRadius: 170, backgroundColor: t.colors.accent, opacity: 0.08 },
    safe: { flex: 1 },
    content: { flexGrow: 1, paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg, paddingBottom: t.spacing.xl },

    topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing['2xl'] },
    mark: { width: 56, height: 56, borderRadius: 18, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', ...t.shadow.md },
    markLogo: { width: 38, height: 38 },
    back: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },

    title: { fontFamily: t.fontFamily.extrabold, fontSize: 30, color: t.colors.text, textAlign: 'right', lineHeight: 40 },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'right', marginTop: 8 },
    form: { marginTop: t.spacing.xl },
  });
