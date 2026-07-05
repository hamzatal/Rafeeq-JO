import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';
import Feather from '@expo/vector-icons/Feather';
import { I18nProvider } from '../src/i18n';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { FeedbackProvider } from '../src/components/Feedback';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';
import { loadAppConfig } from '../src/lib/appConfig';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    // Preload the Feather icon font so icons never flash as empty boxes on cold start.
    ...Feather.font,
  });

  const bootstrap = useAuth((s) => s.bootstrap);
  const hydrate = usePrefs((s) => s.hydrate);
  const hydrated = usePrefs((s) => s.hydrated);
  const scheme = usePrefs((s) => s.scheme);

  useEffect(() => {
    void hydrate();
    // Load public runtime config (maps key, flags). Non-blocking + safe.
    void loadAppConfig();
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
      <ErrorBoundary>
        <I18nProvider>
          <FeedbackProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Slot />
          </FeedbackProvider>
        </I18nProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
