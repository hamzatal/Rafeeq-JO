import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/store/auth';
import { useI18n } from '../../src/i18n';
import { TabBar } from '../../src/components/TabBar';

export default function AppLayout() {
  const status = useAuth((s) => s.status);
  const { t } = useI18n();

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  const tab = (name: keyof typeof Feather.glyphMap) =>
    ({ color, size }: { color: string; size: number }) => <Feather name={name} size={size} color={color} />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Stitch order (RTL, right→left): الرئيسية · الرحلات · [رفيق AI] · المحفظة · الملف */}
      <Tabs.Screen name="home" options={{ title: t('home.title'), tabBarIcon: tab('home') }} />
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
      <Tabs.Screen name="parcels" options={{ href: null }} />
      <Tabs.Screen name="lost-found" options={{ href: null }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="exchange" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
    </Tabs>
  );
}
