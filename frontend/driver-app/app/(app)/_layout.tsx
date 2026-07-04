import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { useAuth } from '../../src/store/auth';
import { useI18n } from '../../src/i18n';
import { TabBar } from '../../src/components/TabBar';

export default function AppLayout() {
  const status = useAuth((s) => s.status);
  const driver = useAuth((s) => s.driver);
  const driverLoaded = useAuth((s) => s.driverLoaded);
  const { t } = useI18n();

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  const tab = (name: keyof typeof Feather.glyphMap) =>
    ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} size={size} color={color} />;

  // Work tabs (offers / trips / earnings) are useless until the account is
  // approved. Hide them for pending captains so they only see "complete your
  // documents" + settings. (Shown during load to avoid a flash for the common
  // approved case.)
  const workHref = driverLoaded && driver?.status !== 'approved' ? null : undefined;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" options={{ title: t('driver.dashboard'), tabBarIcon: tab('grid') }} />
      <Tabs.Screen name="offers" options={{ title: t('driver.offers'), tabBarIcon: tab('inbox'), href: workHref }} />
      <Tabs.Screen name="trips" options={{ title: t('driver.myTrips'), tabBarIcon: tab('navigation'), href: workHref }} />
      <Tabs.Screen name="earnings" options={{ title: t('driver.earnings'), tabBarIcon: tab('credit-card'), href: workHref }} />
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
