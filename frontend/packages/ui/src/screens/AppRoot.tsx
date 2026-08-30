/* ═══════════════════════════════════════════════════════════════════════════
   THE ROOT LAYOUT — one copy.

   ── The most expensive duplicate in the repo, and the hardest to see ───────

   `student-app/app/_layout.tsx` and `driver-app/app/_layout.tsx` were 115 and 109
   lines, and the ONLY difference between them was whitespace: two `useEffect`s
   written across three lines in one and on one line in the other. Nothing else. Not
   a font, not a provider, not an ordering.

   They looked like they had to be separate because every import is relative —
   `../src/lib/api`, `../src/store/auth`, `../src/lib/push` — so each file resolves
   to its own app's modules while the file TEXT is identical. That is precisely the
   shape the `duplicated-app-file` gate could not catch: it compared bytes under
   `src/`, and these are byte-different (by whitespace) and live under `app/`.

   This is where the ordering constraints live, and there are four of them that a
   second copy could silently break:

     1. `ErrorBoundary` takes RESOLVED strings, not a `t` function. It renders
        exactly when something below it threw, and the provider chain is a candidate
        for what threw — so it must not read copy through context.
     2. `ApiProblems` must sit UNDER `FeedbackProvider`: it needs the toast surface.
     3. `NotificationTaps` needs the router, so it must be a component inside the
        tree rather than a call here — which also ties unsubscribing to the tree.
     4. The splash hides only once fonts AND prefs are ready. Hiding on fonts alone
        shows an unstyled frame; hiding on neither hangs on the splash forever.

   Each of those is a decision with a reason, and each was written down twice.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, type ReactNode } from 'react';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t as translate, type Locale } from '@rafeeq/shared';
import type { RafeeqApi } from '@rafeeq/api-client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FeedbackProvider } from '../components/Feedback';
import { loadAppConfig } from '../runtime/appConfig';
import { useI18n } from '../runtime/i18n';
import { useApiProblemToasts } from '../runtime/problems';

/*
 * Module scope, and it has to be.
 *
 * Both root layouts called this before the extraction and it was dropped in the move,
 * so nothing prevented the native splash from auto-hiding — while `AppRoot` returns
 * `null` until fonts AND prefs are ready. Both apps therefore opened on an empty
 * background for the duration of font loading and AsyncStorage hydration, and the
 * `hideAsync()` below resolved against a splash that had already gone.
 *
 * That is constraint 4 in this file's own header, broken by the extraction written to
 * protect it. It belongs here rather than in each app for exactly that reason: one
 * copy cannot be forgotten in one place.
 */
void SplashScreen.preventAutoHideAsync();

/** Unsubscribe function, as returned by each app's `subscribeToNotificationTaps`. */
type Unsubscribe = () => void;

export interface AppRootProps {
  api: RafeeqApi;
  /** True once `useFonts` has resolved. Owned by the app: it bundles the faces. */
  fontsLoaded: boolean;
  /** True once the persisted prefs are read, so `locale` below is trustworthy. */
  hydrated: boolean;
  /** The locale from persisted prefs — read directly, NOT through context. */
  locale: Locale;
  /** Read the persisted prefs. Called once on mount. */
  hydrate: () => Promise<unknown> | void;
  /** Restore the session. Called once the prefs are hydrated. */
  bootstrap: () => Promise<unknown> | void;
  /**
   * This app's notification-tap subscription. Each app maps notification types to
   * its own routes (`src/lib/push.ts`), which is the one real difference between
   * the two roots — and it was not why they were duplicated.
   */
  subscribeToNotificationTaps: (
    handler: (path: string, params?: Record<string, string>) => void,
  ) => Unsubscribe;
  /**
   * The i18n provider, which each app builds over its own prefs store.
   *
   * Passed as a render prop rather than imported, because `packages/ui` must not
   * reach into an app's store — the constraint that created the duplication.
   */
  children?: (slot: ReactNode) => ReactNode;
}

function NotificationTaps({ subscribe }: { subscribe: AppRootProps['subscribeToNotificationTaps'] }) {
  const router = useRouter();

  useEffect(
    () =>
      subscribe((path, params) =>
        router.push(params && Object.keys(params).length > 0 ? { pathname: path, params } : path),
      ),
    [router, subscribe],
  );

  return null;
}

function ApiProblems() {
  const { t } = useI18n();
  useApiProblemToasts({ forbidden: t('common.forbidden'), server: t('common.serverError') });

  return null;
}

export function AppRoot({
  api,
  fontsLoaded,
  hydrated,
  locale,
  hydrate,
  bootstrap,
  subscribeToNotificationTaps,
  children,
}: AppRootProps) {
  useEffect(() => {
    void hydrate();
    /* Public runtime config (the maps key, the legal URLs). Non-blocking, never throws. */
    void loadAppConfig(api);
  }, [hydrate, api]);

  useEffect(() => {
    if (hydrated) void bootstrap();
  }, [hydrated, bootstrap]);

  useEffect(() => {
    if (fontsLoaded && hydrated) void SplashScreen.hideAsync();
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) return null;

  const tree = (
    <FeedbackProvider>
      <StatusBar style="dark" />
      {/* Must sit UNDER FeedbackProvider — it needs the toast surface. */}
      <ApiProblems />
      <NotificationTaps subscribe={subscribeToNotificationTaps} />
      <Slot />
    </FeedbackProvider>
  );

  return (
    <SafeAreaProvider>
      <ErrorBoundary
        labels={{
          title: translate(locale, 'common.crashTitle'),
          body: translate(locale, 'common.crashBody'),
          retry: translate(locale, 'common.retry'),
        }}
      >
        {children ? children(tree) : tree}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
