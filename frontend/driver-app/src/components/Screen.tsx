import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type AppTheme } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  center?: boolean;
}

export function Screen({ children, scroll = false, center = false }: ScreenProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const content = <View style={[s.content, center && s.center]}>{children}</View>;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    scroll: { flexGrow: 1 },
    content: { flex: 1, padding: t.spacing.lg },
    center: { justifyContent: 'center' },
  });
