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
      <Tabs.Screen name="portal" options={{ title: t('guardian.portalTitle'), tabBarIcon: tab('shield') }} />
      <Tabs.Screen name="notifications" options={{ title: t('home.notifications'), tabBarIcon: tab('bell') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title'), tabBarIcon: tab('user') }} />
    </Tabs>
  );
}
