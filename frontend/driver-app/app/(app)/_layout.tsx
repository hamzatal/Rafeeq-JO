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
      <Tabs.Screen name="dashboard" options={{ title: t('driver.dashboard'), tabBarIcon: tab('grid') }} />
      <Tabs.Screen name="offers" options={{ title: t('driver.offers'), tabBarIcon: tab('inbox') }} />
      <Tabs.Screen name="trips" options={{ title: t('driver.myTrips'), tabBarIcon: tab('navigation') }} />
      <Tabs.Screen name="earnings" options={{ title: t('driver.earnings'), tabBarIcon: tab('credit-card') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title'), tabBarIcon: tab('user') }} />

      {/* Secondary screens — reachable via navigation, hidden from the tab bar */}
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="vehicle" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="withdraw" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
    </Tabs>
  );
}
