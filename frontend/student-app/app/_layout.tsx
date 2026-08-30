import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { t as translate } from '@rafeeq/shared';
import { I18nProvider, useI18n } from '../src/i18n';
import { api } from '../src/lib/api';
import { ErrorBoundary, FeedbackProvider, loadAppConfig, useApiProblemToasts } from '@rafeeq/ui';
import { subscribeToNotificationTaps } from '../src/lib/push';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';

SplashScreen.preventAutoHideAsync();

/**
 * Routes 403 and 5xx into the toast surface.
 *
 * A component rather than a call in `RootLayout`, because the hook needs to be
 * below `FeedbackProvider` in the tree and `RootLayout` is what renders it.
 */
/**
 * A notification tap goes to the screen the notification is about.
 *
 * A component, not a call in `RootLayout`, because it needs the router — and it must
 * sit inside the tree so unsubscribing happens with the tree.
 */
function NotificationTaps() {
  const router = useRouter();

  useEffect(
    () =>
      subscribeToNotificationTaps((path, params) =>
        router.push(params && Object.keys(params).length > 0 ? { pathname: path, params } : path),
      ),
    [router],
  );

  return null;
}

function ApiProblems() {
  const { t } = useI18n();
  useApiProblemToasts({ forbidden: t('common.forbidden'), server: t('common.serverError') });

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  const bootstrap = useAuth((s) => s.bootstrap);
  const hydrate = usePrefs((s) => s.hydrate);
  const hydrated = usePrefs((s) => s.hydrated);
  const locale = usePrefs((s) => s.locale);

  useEffect(() => {
    void hydrate();
    /* Public runtime config (the maps key). Non-blocking, never throws. */
    void loadAppConfig(api);
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) void bootstrap();
  }, [hydrated, bootstrap]);

  useEffect(() => {
    if (fontsLoaded && hydrated) void SplashScreen.hideAsync();
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) return null;

  return (
    <SafeAreaProvider>
      {/*
        Resolved strings, not a `t` function.

        `ErrorBoundary` renders exactly when something in the tree threw, and the
        provider chain is a candidate for what threw — so it must not read copy
        through context. The locale is taken from the persisted prefs, which are
        hydrated by the time this renders.
      */}
      <ErrorBoundary
        labels={{
          title: translate(locale, 'common.crashTitle'),
          body: translate(locale, 'common.crashBody'),
          retry: translate(locale, 'common.retry'),
        }}
      >
        <I18nProvider>
          <FeedbackProvider>
            <StatusBar style="dark" />
            {/* Must sit UNDER FeedbackProvider — it needs the toast surface. */}
            <ApiProblems />
            <NotificationTaps />
            <Slot />
          </FeedbackProvider>
        </I18nProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
