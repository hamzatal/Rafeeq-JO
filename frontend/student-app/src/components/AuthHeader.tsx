import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
}

/** Branded header for auth screens — gold-ringed navy mark + Rafeeq wordmark. */
export function AuthHeader({ title, subtitle }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <View style={s.logo}>
        <Text style={s.glyph}>R</Text>
      </View>
      <Text style={s.brand}>رفيق</Text>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { alignItems: 'center', marginTop: t.spacing.xl, marginBottom: t.spacing.lg },
    logo: {
      width: 76, height: 76, borderRadius: 38, backgroundColor: t.colors.primary,
      alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: t.colors.accent,
      marginBottom: t.spacing.sm, ...t.shadow.md,
    },
    glyph: { fontFamily: t.fontFamily.extrabold, fontSize: 38, color: t.colors.accent },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.primary, marginBottom: t.spacing.base },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'center' },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', marginTop: 4 },
  });
