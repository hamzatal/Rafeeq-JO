import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fontFamily, radius, type as typeScale } from '@rafeeq/tokens';
import { UnstyledText } from './Text';

export interface ErrorBoundaryLabels {
  title: string;
  body: string;
  retry: string;
}

interface Props {
  children: React.ReactNode;
  /**
   * Resolved strings, not i18n keys and not a `t` function.
   *
   * This component renders precisely when something in the tree threw, and the
   * thing that threw may be the provider chain itself. Reading copy through a
   * context here would mean the error screen can crash for the same reason the app
   * did — so the app passes plain strings, resolved at its root.
   */
  labels: ErrorBoundaryLabels;
}

interface State {
  hasError: boolean;
}

/**
 * App-wide safety net: catches a rendering error and shows a recoverable screen
 * instead of white-screening the app.
 *
 * Styles come from the token MODULE, not from `useTheme()`, for the same reason
 * the copy is a prop: the theme provider is a candidate for the thing that broke.
 * The old comment called these «Stitch design system (navy + teal, light-mode
 * only)» — a brand deleted in phase 4. The values were already migrated; the
 * sentence describing them was not, and prose is not something `check:design` can
 * see.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    /* A breadcrumb, never a rethrow — rethrowing here white-screens the app. */
    // eslint-disable-next-line no-console
    console.warn('[Rafeeq] UI error caught by boundary:', error);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { title, body, retry } = this.props.labels;

    return (
      <View style={styles.root} accessibilityLiveRegion="assertive">
        <View style={styles.badge}>
          <UnstyledText style={styles.badgeText}>!</UnstyledText>
        </View>
        <UnstyledText style={styles.title} accessibilityRole="header">
          {title}
        </UnstyledText>
        <UnstyledText style={styles.subtitle}>{body}</UnstyledText>
        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel={retry}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <UnstyledText style={styles.btnText}>{retry}</UnstyledText>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  badgeText: { fontSize: typeScale.displayMd.size, fontFamily: fontFamily.bold, color: colors.primary },
  title: {
    fontSize: typeScale.titleLg.size,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typeScale.body.size,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    height: 50,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  btnText: { fontSize: typeScale.titleSm.size, fontFamily: fontFamily.bold, color: colors.onPrimary },
});
