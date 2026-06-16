import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/store/auth';
import { theme } from '../../src/theme';

export default function AppLayout() {
  const status = useAuth((s) => s.status);

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontFamily: theme.fontFamily.bold },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="documents" options={{ title: 'الوثائق' }} />
      <Stack.Screen name="vehicle" options={{ title: 'المركبة' }} />
      <Stack.Screen name="trips" options={{ title: 'رحلاتي' }} />
      <Stack.Screen name="trip/[id]" options={{ title: 'تفاصيل الرحلة' }} />
    </Stack>
  );
}
