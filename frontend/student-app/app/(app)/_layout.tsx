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
      <Tabs.Screen name="home" options={{ title: t('home.title'), tabBarIcon: tab('home') }} />
      <Tabs.Screen name="trips" options={{ title: t('home.trips'), tabBarIcon: tab('navigation') }} />
      <Tabs.Screen name="wallet" options={{ title: t('home.wallet'), tabBarIcon: tab('credit-card') }} />
      <Tabs.Screen name="notifications" options={{ title: t('home.notifications'), tabBarIcon: tab('bell') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title'), tabBarIcon: tab('user') }} />

      {/* Secondary screens — reachable via navigation, hidden from the tab bar */}
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="guardians" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="ride-request" options={{ href: null }} />
      <Tabs.Screen name="parcels" options={{ href: null }} />
      <Tabs.Screen name="lost-found" options={{ href: null }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="exchange" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
    </Tabs>
  );
}
