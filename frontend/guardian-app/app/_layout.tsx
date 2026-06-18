import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from '@expo-google-fonts/tajawal';
import { I18nProvider } from '../src/i18n';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  const bootstrap = useAuth((s) => s.bootstrap);
  const hydrate = usePrefs((s) => s.hydrate);
  const hydrated = usePrefs((s) => s.hydrated);
  const scheme = usePrefs((s) => s.scheme);

  useEffect(() => {
    void hydrate();
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
      <I18nProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Slot />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
