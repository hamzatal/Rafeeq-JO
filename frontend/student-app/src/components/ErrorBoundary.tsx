import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * App-wide safety net: catches any rendering error in the tree and shows a
 * recoverable screen instead of crashing/white-screening the whole app.
 * Styles are self-contained (no theme dependency) so it renders even if the
 * theme/provider is the thing that failed.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep a breadcrumb; never rethrow.
    // eslint-disable-next-line no-console
    console.warn('[Rafeeq] UI error caught by boundary:', error);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.root}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>!</Text>
        </View>
        <Text style={styles.title}>صار خطأ غير متوقّع</Text>
        <Text style={styles.subtitle}>
          واجهنا مشكلة بعرض هذه الشاشة. باقي التطبيق يعمل بشكل طبيعي — جرّب مرة أخرى.
        </Text>
        <Pressable onPress={this.reset} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.btnText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }
}

// Self-contained brand constants (must render even if the theme provider is
// the thing that failed) — Design System v7 "Onyx" (ink + signature blue).
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0D12', alignItems: 'center', justifyContent: 'center', padding: 28 },
  badge: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(47,107,255,0.16)', borderWidth: 2, borderColor: '#2F6BFF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  badgeText: { fontSize: 36, fontWeight: '800', color: '#5B8CFF' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 24, maxWidth: 320 },
  btn: { backgroundColor: '#2F6BFF', paddingHorizontal: 28, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
