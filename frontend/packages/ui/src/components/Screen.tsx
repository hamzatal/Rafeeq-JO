import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme, type AppTheme } from '../theme';

/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN — safe area, scrolling, and the keyboard, decided once.

   ── Two measured problems ─────────────────────────────────────────────────

   **1. It was barely used.** This component existed in BOTH apps and had exactly
   TWO call sites in total. Every other screen hand-rolled its own
   `SafeAreaView` + `ScrollView`, which is why the two apps have different padding
   on comparable screens and why the insets are handled four different ways.

   **2. `KeyboardAvoidingView` was on 3 files out of 23 that have text inputs.**
   The other twenty put the submit button under the keyboard. On the login screen
   that is unrecoverable without dismissing the keyboard first, and on the OTP
   screen — six digits and a "verify" button — it is the entire flow.

   That is not twenty oversights. It is one missing default: RN does nothing about
   the keyboard unless told, and the telling has to happen per screen. Making it
   the default here is the only way it stops being forgotten.

   ── Why `behavior` differs by platform ────────────────────────────────────

   iOS needs `padding`; Android's window already resizes (`adjustResize`) and
   applying `padding` there double-counts, pushing content off the top. `height`
   on Android is the documented pairing.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  center?: boolean;
  /**
   * Keyboard avoidance. On by default.
   *
   * Turn it off only for a screen that owns a full-height map or its own
   * `KeyboardAvoidingView` — a nested one fights the outer one.
   */
  avoidKeyboard?: boolean;
  /** `false` when the screen paints edge to edge, e.g. behind a map. */
  padded?: boolean;
  /** `'transparent'` when a parent already paints the canvas. */
  background?: 'default' | 'transparent';
  edges?: readonly Edge[];
  /** Rendered outside the scroll area, pinned to the bottom. */
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll = false,
  center = false,
  avoidKeyboard = true,
  padded = true,
  background = 'default',
  edges = ['top', 'bottom'],
  footer,
}: ScreenProps) {
  const t = useTheme();
  const s = makeStyles(t);

  const body = <View style={[padded && s.padded, center && s.center, s.grow]}>{children}</View>;

  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[s.scroll, center && s.center]}
      keyboardShouldPersistTaps="handled"
      /*
       * `interactive` on iOS lets a drag dismiss the keyboard, which is how every
       * native app behaves and what someone reaching for a field below the fold
       * will try first.
       */
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  ) : (
    body
  );

  const withKeyboard = avoidKeyboard ? (
    <KeyboardAvoidingView style={s.grow} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  return (
    <SafeAreaView style={[s.safe, background === 'transparent' && s.transparent]} edges={edges}>
      {withKeyboard}
      {footer}
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    transparent: { backgroundColor: 'transparent' },
    grow: { flex: 1 },
    scroll: { flexGrow: 1 },
    padded: { padding: t.space.lg },
    center: { justifyContent: 'center' },
  });
