/* ═══════════════════════════════════════════════════════════════════════════
   A stand-in for `react-native-safe-area-context`, for tests only.

   The real package resolves to its own `src/SafeAreaContext.tsx`, which contains
   `import typeof` — the same Flow-in-source problem as `react-native-svg` beside this
   file, and as the `react-native` syntax that broke `next build` in phase 6.

   Without this, no component that reads the safe area could be tested at all: that is
   `TabBar`, `Screen`, `Loader`, `Feedback` and six of the shared screens. The insets
   below are an iPhone 14's — a notch and a home indicator — so a test can assert that
   a bar actually clears them rather than asserting against zero.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Metrics {
  frame: { x: number; y: number; width: number; height: number };
  insets: EdgeInsets;
}

export type Edge = 'top' | 'right' | 'bottom' | 'left';

/** An iPhone 14: 47pt of notch, 34pt of home indicator. */
const INSETS: EdgeInsets = { top: 47, right: 0, bottom: 34, left: 0 };

export const initialWindowMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: INSETS,
};

export const useSafeAreaInsets = (): EdgeInsets => INSETS;

export const useSafeAreaFrame = () => initialWindowMetrics.frame;

export function SafeAreaProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

/**
 * Passes props through so `edges` stays visible to an assertion, but applies no
 * padding: which edges a screen insets is a layout question, and layout is not what
 * `react-native-web` under jsdom can prove. See the note in `vitest.config.ts`.
 */
export function SafeAreaView({ children, ...props }: ViewProps & { edges?: Edge[] }) {
  return <View {...props}>{children}</View>;
}

export const SafeAreaInsetsContext = {
  Consumer: ({ children }: { children: (insets: EdgeInsets) => ReactNode }) => <>{children(INSETS)}</>,
};
