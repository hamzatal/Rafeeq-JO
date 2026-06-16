import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  center?: boolean;
}

export function Screen({ children, scroll = false, center = false }: ScreenProps) {
  const content = (
    <View style={[styles.content, center && styles.center]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: theme.spacing.lg },
  center: { justifyContent: 'center' },
});
