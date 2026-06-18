import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/store/auth';
import { useI18n } from '../../src/i18n';
import { useTheme } from '../../src/theme';

export default function AppLayout() {
  const status = useAuth((s) => s.status);
  const { t } = useI18n();
  const theme = useTheme();

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  const tab = (name: keyof typeof Feather.glyphMap) =>
    ({ color, size }: { color: string; size: number }) => <Feather name={name} size={size} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: theme.fontFamily.medium, fontSize: 11 },
      }}
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
    </Tabs>
  );
}
