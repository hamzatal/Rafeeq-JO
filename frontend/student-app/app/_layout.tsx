import type { ReactNode } from 'react';
import {
  useFonts,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { AppRoot } from '@rafeeq/ui';
import { I18nProvider } from '../src/i18n';
import { api } from '../src/lib/api';
import { subscribeToNotificationTaps } from '../src/lib/push';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  return (
    <AppRoot
      api={api}
      fontsLoaded={fontsLoaded}
      hydrated={usePrefs((s) => s.hydrated)}
      locale={usePrefs((s) => s.locale)}
      hydrate={usePrefs((s) => s.hydrate)}
      bootstrap={useAuth((s) => s.bootstrap)}
      subscribeToNotificationTaps={subscribeToNotificationTaps}
    >
      {/* This app's provider, over this app's prefs store — the one thing
          `packages/ui` cannot import for itself. */}
      {(slot: ReactNode) => <I18nProvider>{slot}</I18nProvider>}
    </AppRoot>
  );
}
