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
      {/* Stitch order (RTL right→left): الرئيسية · الرحلات · المحفظة · الملف · الإعدادات */}
      <Tabs.Screen name="dashboard" options={{ title: t('driver.dashboard'), tabBarIcon: tab('grid-3x3') }} />
      <Tabs.Screen name="trips" options={{ title: t('driver.myTrips'), tabBarIcon: tab('navigation') }} />
      <Tabs.Screen name="earnings" options={{ title: t('driver.wallet'), tabBarIcon: tab('credit-card') }} />
      <Tabs.Screen name="profile" options={{ title: t('driver.profileTab'), tabBarIcon: tab('user') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title'), tabBarIcon: tab('settings') }} />

      {/* Secondary screens — reachable via navigation, hidden from the tab bar */}
      <Tabs.Screen name="offers" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="vehicle" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="withdraw" options={{ href: null }} />
      <Tabs.Screen name="earnings-detail" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
    </Tabs>
  );
}
