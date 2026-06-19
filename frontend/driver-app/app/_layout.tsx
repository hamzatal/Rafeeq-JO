import { useEffect } from 'react';
import { Slot } from 'expo-router';
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
import { I18nProvider } from '../src/i18n';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';
import { loadAppConfig } from '../src/lib/appConfig';

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => { void hydrate(); void loadAppConfig(); }, [hydrate]);
  useEffect(() => { if (hydrated) void bootstrap(); }, [hydrated, bootstrap]);
  useEffect(() => { if (fontsLoaded && hydrated) void SplashScreen.hideAsync(); }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <I18nProvider>
          <StatusBar style="light" />
          <Slot />
        </I18nProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
