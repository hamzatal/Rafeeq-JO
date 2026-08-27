import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/store/auth';
import { useI18n } from '../../src/i18n';
import { Icon, TabBar, type IconName } from '@rafeeq/ui';

export default function AppLayout() {
  const status = useAuth((s) => s.status);
  const { t } = useI18n();

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  /*
   * Through the shared `Icon`, not Feather directly.
   *
   * This imported `Feather` straight from `@expo/vector-icons`, so the five tab
   * glyphs came from a DIFFERENT icon set than every other glyph in the app — and
   * got none of the RTL mirroring the wrapper applies.
   */
  const tab = (name: IconName) =>
    ({ color, size }: { color: string; size: number }) => <Icon name={name} size={size} color={color} />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Stitch order (RTL, right→left): الرئيسية · الرحلات · [رفيق AI] · المحفظة · الملف */}
      <Tabs.Screen name="home" options={{ title: t('home.title'), tabBarIcon: tab('house') }} />
      <Tabs.Screen name="trips" options={{ title: t('home.trips'), tabBarIcon: tab('navigation') }} />
      <Tabs.Screen name="assistant" options={{ title: 'رفيق AI', tabBarIcon: tab('message-circle') }} />
      <Tabs.Screen name="wallet" options={{ title: t('home.wallet'), tabBarIcon: tab('credit-card') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title'), tabBarIcon: tab('user') }} />

      {/* Secondary screens — reachable via navigation, hidden from the tab bar */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="ride-request" options={{ href: null }} />
      <Tabs.Screen name="lost-found" options={{ href: null }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
    </Tabs>
  );
}
